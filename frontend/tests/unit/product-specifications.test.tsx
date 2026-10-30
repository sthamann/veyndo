/** Specification editing checks regional inheritance, native consumer merge, safe map mutation and current read/write behavior. */
import { useState } from "react";
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import { LocaleProvider } from "../../src/shared/i18n/i18n";
import ProductSpecifications from "../../src/admin/catalog/ProductSpecifications";
import PairFields from "../../src/admin/catalog/PairFields";
import ProductEditor from "../../src/admin/catalog/ProductEditor";
import {
  newDraft,
  type ProductDraft,
} from "../../src/admin/catalog/catalog-model";
import { productSpecifications } from "../../src/shared/content/product-specifications";
function fixture() {
  const d = newDraft();
  d.mainLocale = "es-ES";
  d.availableLocales = ["es-ES", "it-IT", "en-GB", "en-US"];
  d.extra.specifications = {
    "es-ES": { Material: "Madera", Care: "Seco" },
    "en-US": { Material: "US" },
  };
  return d;
}
it("resolves specification locale independently of plain translations and never borrows sibling English", () => {
  const d = fixture(),
    change = vi.fn();
  const { rerender } = render(
    <ProductSpecifications draft={d} lang="it" onChange={change} />,
    { wrapper: LocaleProvider },
  );
  expect(screen.getByDisplayValue("Madera")).toBeVisible();
  expect(change).not.toHaveBeenCalled();
  rerender(
    <LocaleProvider>
      <ProductSpecifications draft={d} lang="en-GB" onChange={change} />
    </LocaleProvider>,
  );
  expect(screen.queryByDisplayValue("US")).not.toBeInTheDocument();
  expect(screen.getByDisplayValue("Madera")).toBeVisible();
});
it("edits the proper regional group, retains inherited fields in the preview and resets only the selected translation", async () => {
  let saved = fixture();
  function Editor() {
    const [d, set] = useState(saved);
    return (
      <ProductSpecifications
        draft={d}
        lang="it"
        onChange={(v) => {
          saved = v;
          set(v);
        }}
      />
    );
  }
  render(<Editor />, { wrapper: LocaleProvider });
  const user = userEvent.setup();
  const values = screen.getAllByLabelText("Value", { exact: true });
  await user.clear(values[0]);
  await user.type(values[0], "Legno");
  expect(saved.extra.specifications["it-IT"]).toEqual({
    Material: "Legno",
    Care: "Seco",
  });
  await user.click(screen.getByRole("button", { name: "Remove Care" }));
  expect(
    within(screen.getByLabelText("Product-page preview")).getByText("Seco"),
  ).toBeVisible();
  await user.click(screen.getByRole("button", { name: /Own translation/ }));
  expect(saved.extra.specifications["it-IT"]).toBeUndefined();
  expect(saved.extra.specifications["es-ES"].Material).toBe("Madera");
});
it("does not overwrite sibling rows when renaming and creates no whitespace map keys", async () => {
  let saved: Record<string, string> = { Material: "Oak", Care: "Dry" };
  function Editor() {
    const [d, set] = useState(saved);
    return (
      <PairFields
        value={d}
        onChange={(v) => {
          saved = v;
          set(v);
        }}
      />
    );
  }
  render(<Editor />, { wrapper: LocaleProvider });
  const user = userEvent.setup();
  const key = screen.getByDisplayValue("Material");
  await user.clear(key);
  await user.type(key, "Care");
  await user.tab();
  expect(screen.getByRole("alert")).toHaveTextContent(
    "Both existing values were kept",
  );
  expect(saved).toEqual({ Material: "Oak", Care: "Dry" });
  await user.clear(key);
  await user.type(key, "Finish");
  await user.keyboard("{Enter}");
  expect(saved).toEqual({ Finish: "Oak", Care: "Dry" });
  await user.type(screen.getByLabelText("New name"), "Size");
  await user.type(screen.getByLabelText("New value"), "Large");
  expect(saved).not.toHaveProperty("Size");
  await user.click(screen.getByRole("button", { name: "Add detail" }));
  expect(saved).toHaveProperty("Size", "Large");
  expect(Object.keys(saved).every((k) => k.trim())).toBe(true);
});
it("does not fabricate language values while viewing read-only details and disables mutations", () => {
  const change = vi.fn();
  render(
    <ProductSpecifications
      draft={fixture()}
      lang="it"
      canWrite={false}
      onChange={change}
    />,
    { wrapper: LocaleProvider },
  );
  expect(screen.queryByLabelText("New name")).not.toBeInTheDocument();
  screen.getAllByRole("textbox").forEach((e) => expect(e).toBeDisabled());
  expect(change).not.toHaveBeenCalled();
});
it("merges field-level fallback like the native owner and preserves explicit empty values", () => {
  expect(
    productSpecifications(
      {
        es: { Material: "Madera", Care: "Seco" },
        "es-ES": { Material: "Roble" },
        it: { Material: "" },
      },
      "it-IT",
      "es-ES",
    ),
  ).toEqual({ Material: "", Care: "Seco" });
  expect(
    productSpecifications({ "en-US": { Material: "US" } }, "en-GB"),
  ).toEqual({});
});
it("saves specifications and dimensions through the native aggregate without replaying untouched stock", async () => {
  const d = fixture();
  d.id = "chair";
  d.revision = 6;
  d.contentRevision = 5;
  d.catalog.productNumber = "SPECS-01";
  d.translations = {
    es: { name: "Silla", description: null },
    it: { name: null, description: null },
  };
  d.commerce.stock = 20;
  const request = vi.fn(async (_p: string, _b?: unknown, m?: string) =>
    m === "PUT"
      ? { id: "chair", revision: 7, contentRevision: 6, stock: 20 }
      : d,
  );
  render(
    <ProductEditor
      id="chair"
      request={request}
      categories={[]}
      initialTab="specs"
      onBack={vi.fn()}
      onCreated={vi.fn()}
    />,
    { wrapper: LocaleProvider },
  );
  await screen.findByRole("heading", { name: "Silla", level: 1 });
  const user = userEvent.setup();
  await user.selectOptions(screen.getByLabelText("Content language"), "it");
  const region = screen.getByRole("region", { name: "Product details" });
  await user.type(within(region).getByLabelText("New name"), "Finish");
  await user.type(within(region).getByLabelText("New value"), "Oil");
  await user.click(within(region).getByRole("button", { name: "Add detail" }));
  await user.type(screen.getByLabelText("Weight (kg)"), "1.25");
  await user.click(screen.getByRole("button", { name: "Save product" }));
  await waitFor(() =>
    expect(request.mock.calls.some((call) => call[2] === "PUT")).toBe(true),
  );
  const body = request.mock.calls.find(
    (call) => call[2] === "PUT",
  )![1] as ProductDraft;
  expect(body.extra.specifications["it-IT"].Finish).toBe("Oil");
  expect(body.extra.automation.weight).toBe(1.25);
  expect(body.commerce).not.toHaveProperty("stock");
});

it("rejects overlong multibyte names without writing and caps new rows at the native limit", async () => {
  const change = vi.fn(),
    user = userEvent.setup();
  const { rerender } = render(
    <PairFields value={{ Material: "Oak" }} onChange={change} />,
    { wrapper: LocaleProvider },
  );
  await user.type(screen.getByLabelText("New name"), "é".repeat(51));
  await user.click(screen.getByRole("button", { name: "Add detail" }));
  expect(screen.getByRole("alert")).toHaveTextContent("100 bytes");
  expect(change).not.toHaveBeenCalled();
  rerender(
    <LocaleProvider>
      <PairFields
        value={Object.fromEntries(
          Array.from({ length: 40 }, (_, i) => [`Key ${i}`, "x"]),
        )}
        onChange={change}
      />
    </LocaleProvider>,
  );
  expect(screen.getByRole("button", { name: "Add detail" })).toBeDisabled();
  const source = JSON.parse('{"en":{"__proto__":"safe value"}}');
  const merged = productSpecifications(source, "en-GB");
  expect(Object.hasOwn(merged, "__proto__")).toBe(true);
  expect(Object.getPrototypeOf(merged)).toBe(Object.prototype);
});

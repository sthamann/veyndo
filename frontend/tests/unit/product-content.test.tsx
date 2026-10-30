/** Product content keeps legacy text during translation, preserves deliberate blanks, and previews without creating writes. */
import { useState } from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import { LocaleProvider } from "../../src/shared/i18n/i18n";
import { ProductRich } from "../../src/admin/catalog/ProductLocalizedContent";
import ProductEditor from "../../src/admin/catalog/ProductEditor";
import { productRichContent } from "../../src/admin/catalog/product-content-model";
import {
  newDraft,
  type ProductDraft,
} from "../../src/admin/catalog/catalog-model";

function fixture(): ProductDraft {
  const d = newDraft();
  d.id = "p1";
  d.revision = 7;
  d.contentRevision = 5;
  d.mainLocale = "de-DE";
  d.availableLocales = ["de-DE", "en-GB", "en-US", "it-IT"];
  d.catalog.productNumber = "CONTENT-01";
  d.translations = {
    de: { name: "Form Stuhl", description: "Bestehende Beschreibung" },
    "en-GB": { name: null, description: null },
    "en-US": { name: null, description: null },
    it: { name: null, description: null },
  };
  return d;
}
it("resolves rich keys independently from product text keys without borrowing a sibling region", () => {
  const d = fixture();
  d.extra.richDescription = {
    "de-DE": [{ type: "paragraph", text: "Formatierter Haupttext" }],
    "en-US": [{ type: "paragraph", text: "US only" }],
  };
  expect(productRichContent(d, "it").blocks[0].text).toBe(
    "Formatierter Haupttext",
  );
  expect(productRichContent(d, "en-GB").blocks[0].text).toBe(
    "Formatierter Haupttext",
  );
  expect(productRichContent(d, "de").isMain).toBe(true);
  expect(productRichContent(d, "de").key).toBe("de-DE");
  expect(productRichContent(d, "en-US").blocks[0].text).toBe("US only");
});
it("keeps explicit empty rich content and short text empty", () => {
  const d = fixture();
  d.extra.richDescription = { it: [] };
  expect(productRichContent(d, "it").blocks).toEqual([]);
  d.extra.richDescription = {};
  d.translations.it.description = "";
  expect(productRichContent(d, "it").blocks[0].text).toBe("");
});
it("preserves the displayed legacy description when creating and resetting a fifth-language translation", async () => {
  const user = userEvent.setup(),
    change = vi.fn();
  function Editor() {
    const [d, set] = useState(fixture());
    return (
      <ProductRich
        draft={d}
        lang="it"
        onChange={(next) => {
          change(next);
          set(next);
        }}
      />
    );
  }
  render(<Editor />, { wrapper: LocaleProvider });
  expect(
    await screen.findByRole("textbox", { name: "Product description" }),
  ).toHaveTextContent("Bestehende Beschreibung");
  expect(change).not.toHaveBeenCalled();
  await user.click(
    screen.getByRole("button", { name: /Inherited from German/ }),
  );
  expect(change.mock.lastCall![0].extra.richDescription.it[0].text).toBe(
    "Bestehende Beschreibung",
  );
  expect(
    screen.getByRole("textbox", { name: "Product description" }),
  ).toHaveTextContent("Bestehende Beschreibung");
  await user.click(screen.getByRole("button", { name: /Own translation/ }));
  expect(change.mock.lastCall![0].extra.richDescription.it).toBeUndefined();
  expect(
    screen.getByRole("textbox", { name: "Product description" }),
  ).toHaveTextContent("Bestehende Beschreibung");
});
it("previews explicit empty content without falling back to a nonempty short description", async () => {
  const d = fixture();
  d.extra.richDescription = { it: [] };
  const change = vi.fn(),
    user = userEvent.setup();
  render(<ProductRich draft={d} lang="it" onChange={change} />, {
    wrapper: LocaleProvider,
  });
  expect(
    await screen.findByRole("textbox", { name: "Product description" }),
  ).not.toHaveTextContent("Bestehende Beschreibung");
  await user.click(screen.getByRole("button", { name: "Preview" }));
  expect(
    screen.queryByRole("textbox", { name: "Product description" }),
  ).not.toBeInTheDocument();
  expect(screen.queryByText("Bestehende Beschreibung")).not.toBeInTheDocument();
  expect(change).not.toHaveBeenCalled();
  await user.click(screen.getByRole("button", { name: "Visual editor" }));
  expect(
    screen.getByRole("textbox", { name: "Product description" }),
  ).toBeVisible();
});
it("renders inherited content without translation or editing controls for read-only users", () => {
  const d = fixture();
  d.extra.richDescription = {
    "de-DE": [{ type: "paragraph", text: "Nur lesen" }],
  };
  const change = vi.fn();
  render(
    <ProductRich draft={d} lang="it" canWrite={false} onChange={change} />,
    { wrapper: LocaleProvider },
  );
  expect(screen.getByText("Nur lesen")).toBeVisible();
  expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  expect(screen.queryByRole("button")).not.toBeInTheDocument();
  expect(change).not.toHaveBeenCalled();
});
it("keeps optional identifiers available and saves a translated description through the native aggregate without stock", async () => {
  const d = fixture(),
    user = userEvent.setup();
  const request = vi.fn(
    async (_path: string, _body?: unknown, method?: string) =>
      method === "PUT"
        ? { id: "p1", revision: 8, contentRevision: 6, stock: d.commerce.stock }
        : d,
  );
  render(
    <ProductEditor
      id="p1"
      request={request}
      categories={[]}
      onBack={vi.fn()}
      onCreated={vi.fn()}
    />,
    { wrapper: LocaleProvider },
  );
  await screen.findByRole("heading", { name: "Form Stuhl", level: 1 });
  await user.selectOptions(screen.getByLabelText("Content language"), "it");
  await screen.findByRole("textbox", { name: "Product description" });
  await user.click(
    within(
      screen.getByRole("region", { name: "Product description" }),
    ).getByRole("button", { name: /Inherited from German/ }),
  );
  await user.click(screen.getByText("Product identifiers & shipping flags"));
  await user.type(screen.getByLabelText("Manufacturer"), "Atelier");
  await user.click(screen.getByRole("button", { name: "Save product" }));
  await waitFor(() =>
    expect(request).toHaveBeenCalledWith(
      "/api/merchant/products/p1",
      expect.objectContaining({
        contentRevision: 5,
        extra: expect.objectContaining({
          identity: { manufacturer: "Atelier" },
          richDescription: {
            it: [{ type: "paragraph", text: "Bestehende Beschreibung" }],
          },
        }),
      }),
      "PUT",
    ),
  );
  const saved = request.mock.calls.find(
    ([, , method]) => method === "PUT",
  )![1] as ProductDraft;
  expect(saved.commerce).not.toHaveProperty("stock");
});

it("identifies a localized short description as the starting point instead of claiming main-language inheritance", async () => {
  const d = fixture();
  d.translations.it.description = "Introduzione italiana";
  const change = vi.fn();
  render(<ProductRich draft={d} lang="it" onChange={change} />, {
    wrapper: LocaleProvider,
  });
  expect(
    await screen.findByRole("textbox", { name: "Product description" }),
  ).toHaveTextContent("Introduzione italiana");
  expect(
    screen.getByRole("button", { name: /From the short description/ }),
  ).toBeVisible();
  expect(
    screen.queryByRole("button", { name: /Inherited from German/ }),
  ).not.toBeInTheDocument();
  expect(change).not.toHaveBeenCalled();
});

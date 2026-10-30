/** SEO preview, native-limit feedback, language isolation and real aggregate saves use one presentation contract. */
import { useState } from "react";
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import ProductSeo from "../../src/admin/catalog/ProductSeo";
import ProductEditor from "../../src/admin/catalog/ProductEditor";
import {
  newDraft,
  type ProductDraft,
} from "../../src/admin/catalog/catalog-model";
import { LocaleProvider } from "../../src/shared/i18n/i18n";
import {
  productPath,
  productSeoFields,
  invalidProductSeo,
} from "../../src/shared/content/product-seo";
function fixture(): ProductDraft {
  const d = newDraft();
  d.id = "chair";
  d.revision = 5;
  d.contentRevision = 4;
  d.catalog.productNumber = "SEO-01";
  d.mainLocale = "de-DE";
  d.availableLocales = ["de-DE", "en-GB", "en-US", "it-IT"];
  d.translations = {
    de: { name: "Form Stuhl", description: "Produktbeschreibung" },
    it: { name: null, description: null },
    "en-GB": { name: null, description: null },
    "en-US": { name: null, description: null },
  };
  d.extra.seo = {
    "de-DE": {
      title: "Stuhl aus Eiche",
      description: "Für ruhige Momente.",
      slug: "stuhl-aus-eiche",
    },
    "en-US": { title: "US chair" },
  };
  return d;
}
it("previews the regional main SEO in a fifth language without changing the draft or borrowing sibling English", () => {
  const d = fixture(),
    change = vi.fn();
  const { rerender } = render(
    <LocaleProvider>
      <ProductSeo draft={d} lang="it" onChange={change} />
    </LocaleProvider>,
  );
  expect(screen.getByLabelText("Meta title")).toHaveAttribute(
    "placeholder",
    "Stuhl aus Eiche",
  );
  expect(
    within(screen.getByRole("region", { name: "Search preview" })).getByText(
      "Stuhl aus Eiche",
    ),
  ).toBeVisible();
  rerender(
    <LocaleProvider>
      <ProductSeo draft={d} lang="en-GB" onChange={change} />
    </LocaleProvider>,
  );
  expect(screen.getByLabelText("Meta title")).toHaveAttribute(
    "placeholder",
    "Stuhl aus Eiche",
  );
  expect(change).not.toHaveBeenCalled();
});
it("edits and resets independent fields without replacing source SEO or explicit blanks", async () => {
  const user = userEvent.setup();
  let saved = fixture();
  function Editor() {
    const [d, set] = useState(saved);
    return (
      <ProductSeo
        draft={d}
        lang="it"
        onChange={(next) => {
          saved = next;
          set(next);
        }}
      />
    );
  }
  render(<Editor />, { wrapper: LocaleProvider });
  await user.type(screen.getByLabelText("Meta title"), "Titolo italiano");
  expect(saved.extra.seo["de-DE"].title).toBe("Stuhl aus Eiche");
  expect(saved.extra.seo["it-IT"].title).toBe("Titolo italiano");
  await user.clear(screen.getByLabelText("Meta title"));
  expect(
    within(screen.getByRole("region", { name: "Search preview" })).getByText(
      "No title set",
    ),
  ).toBeVisible();
  await user.click(screen.getByRole("button", { name: /Own translation/ }));
  expect(saved.extra.seo["it-IT"].title).toBeNull();
  expect(screen.getByLabelText("Meta title")).toHaveAttribute(
    "placeholder",
    "Stuhl aus Eiche",
  );
});
it("uses product text automatically and does not fabricate an address for an unsaved product", () => {
  const d = fixture();
  delete d.id;
  d.extra.seo = {};
  render(<ProductSeo draft={d} lang="it" onChange={vi.fn()} />, {
    wrapper: LocaleProvider,
  });
  expect(screen.getByLabelText("Meta title")).toHaveAttribute(
    "placeholder",
    "Form Stuhl",
  );
  expect(screen.getByLabelText("Meta description").tagName).toBe("TEXTAREA");
  expect(
    screen.getByText("Save the product to obtain its address."),
  ).toBeVisible();
});
it("encodes the actual stable product path and preserves blank per-field fallbacks", () => {
  expect(productPath("chair 1", "été & bois")).toBe(
    "/products/chair%201/%C3%A9t%C3%A9%20%26%20bois",
  );
  expect(
    productSeoFields(
      {
        de: { title: "Source", description: "Source" },
        it: { title: "", description: null },
      },
      "it-IT",
      "de-DE",
    ),
  ).toEqual({ title: "", description: "Source", slug: undefined });
  expect(invalidProductSeo({ de: { title: "é".repeat(101) } })).toBe(true);
  expect(invalidProductSeo({ de: { slug: "part/other" } })).toBe(true);
  expect(
    invalidProductSeo({ de: { slug: "été-et-bois", description: "" } }),
  ).toBe(false);
});
it("marks an invalid slug and blocks the real editor save until corrected, then omits untouched stock", async () => {
  const d = fixture(),
    user = userEvent.setup();
  const request = vi.fn(
    async (_path: string, _body?: unknown, method?: string) =>
      method === "PUT"
        ? { id: "chair", revision: 6, contentRevision: 5, stock: 20 }
        : d,
  );
  render(
    <ProductEditor
      id="chair"
      initialTab="seo"
      request={request}
      categories={[]}
      onBack={vi.fn()}
      onCreated={vi.fn()}
    />,
    { wrapper: LocaleProvider },
  );
  await screen.findByRole("heading", { name: "Form Stuhl", level: 1 });
  await user.selectOptions(screen.getByLabelText("Content language"), "it");
  await user.type(screen.getByLabelText("Readable URL ending"), "bad/path");
  expect(screen.getByLabelText("Readable URL ending")).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  await user.click(screen.getByRole("button", { name: "Save product" }));
  expect(
    request.mock.calls.filter(([, , method]) => method === "PUT"),
  ).toHaveLength(0);
  await user.clear(screen.getByLabelText("Readable URL ending"));
  await user.type(
    screen.getByLabelText("Readable URL ending"),
    "sedia-in-legno",
  );
  await user.click(screen.getByRole("button", { name: "Save product" }));
  await waitFor(() =>
    expect(
      request.mock.calls.filter(([, , method]) => method === "PUT"),
    ).toHaveLength(1),
  );
  const payload = request.mock.calls.find(
    ([, , method]) => method === "PUT",
  )![1] as ProductDraft;
  expect(payload.extra.seo["it-IT"].slug).toBe("sedia-in-legno");
  expect(payload.commerce).not.toHaveProperty("stock");
});

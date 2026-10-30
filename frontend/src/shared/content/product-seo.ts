/** Shared SEO field fallback and encoded product paths keep Studio previews and native storefront presentation consistent. */
export type ProductSeoFields = {
  title?: string | null;
  description?: string | null;
  slug?: string | null;
};
export type ProductSeoMap = Record<string, ProductSeoFields | null>;
export function productSeoFields(
  map: ProductSeoMap = {},
  language: string,
  main = language,
): ProductSeoFields {
  const keys = [language, language.split("-")[0], main, main.split("-")[0]];
  return Object.fromEntries(
    (["title", "description", "slug"] as const).map((field) => [
      field,
      keys.map((key) => map[key]?.[field]).find((value) => value != null),
    ]),
  );
}
export function productPath(id: string, slug?: string | null) {
  return `/products/${encodeURIComponent(id)}${slug ? `/${encodeURIComponent(slug)}` : ""}`;
}

/** Client feedback mirrors native UTF-8 limits and forbidden slug separators; the Rust write remains authoritative. */
export function productSeoIssue(
  field: keyof ProductSeoFields,
  value?: string | null,
) {
  if (value == null) return undefined;
  if (
    new TextEncoder().encode(value).length >
    (field === "description" ? 500 : 200)
  )
    return "tooLong" as const;
  if (field === "slug" && /[?#/]/.test(value)) return "invalidSlug" as const;
  return undefined;
}
export function invalidProductSeo(map: ProductSeoMap = {}) {
  return Object.values(map).some(
    (record) =>
      record &&
      (["title", "description", "slug"] as const).some((field) =>
        productSeoIssue(field, record[field]),
      ),
  );
}

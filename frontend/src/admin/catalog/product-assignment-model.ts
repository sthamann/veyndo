/** Bounded category paths and current product-channel choices preserve native IDs and language inheritance. */
import { inheritedText } from "../../shared/geography/geography-types";
import type { Category, ProductDraft } from "./catalog-model";
export function categoryChoices(
  categories: Category[],
  language: string,
  mainLocale: string,
) {
  const byId = new Map(categories.map((category) => [category.id, category]));
  return categories
    .map((category) => {
      const path: string[] = [],
        visited = new Set<string>();
      let current: Category | undefined = category;
      while (current && !visited.has(current.id)) {
        visited.add(current.id);
        path.unshift(
          inheritedText(
            current.data.translations,
            language,
            mainLocale,
            "name",
          ) || current.id,
        );
        current = current.parentId ? byId.get(current.parentId) : undefined;
      }
      return { category, label: path.join(" / ") };
    })
    .sort((a, b) => a.label.localeCompare(b.label));
}
export function productChannelIds(draft: ProductDraft) {
  return (
    draft.catalog.salesChannelIds ??
    draft.channels
      ?.filter((channel) => channel.visible)
      .map((channel) => channel.id) ??
    []
  );
}
export function assignmentSearch(value: string) {
  return value.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase().trim();
}

/** Product fields use short keys only when a single enabled region exists; channel names retain full locales. */
export function assignmentLanguage(draft: ProductDraft, language: string) {
  const matches = (draft.availableLocales ?? []).filter(
    (locale) => locale.split("-")[0] === language,
  );
  return matches.length === 1 ? matches[0] : language;
}

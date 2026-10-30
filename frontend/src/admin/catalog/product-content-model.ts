/** Product rich content resolves its own language keys and preserves explicit blanks and legacy text on translation. */
import {
  contentKey,
  contentText,
  contentLocale,
} from "../../shared/i18n/content-language";
import type { RichBlock } from "../../shared/content/RichDescription";
import type { ProductDraft } from "./catalog-model";
export function productRichContent(draft: ProductDraft, language: string) {
  const main = draft.mainLocale ?? "en-GB";
  const locales = draft.availableLocales ?? [main, language];
  const locale = contentLocale(language, locales);
  const map: Record<string, RichBlock[]> = draft.extra.richDescription ?? {};
  const resolved = contentKey(map, locale, locales);
  const key = resolved in map ? resolved : language;
  const mainKey = contentKey(map, main, locales);
  const descriptions = Object.fromEntries(
    Object.entries(draft.translations).map(([key, value]) => [
      key,
      value.description,
    ]),
  );
  const blocks: RichBlock[] = map[key] ??
    map[mainKey] ?? [
      { type: "paragraph", text: contentText(descriptions, locale, main) },
    ];
  return {
    key,
    fromShortText:
      map[key] == null &&
      map[mainKey] == null &&
      descriptions[contentKey(descriptions, locale, locales)] != null &&
      locale !== main,
    main,
    isMain: locale === main,
    inherited: locale !== main && map[key] == null,
    map,
    blocks,
  };
}

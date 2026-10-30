/** Consistent main-language inheritance for product rich documents, specification groups and individual SEO fields. */
import RichDescription from "../../shared/content/RichDescription";
import { ContentLanguage } from "../../shared/i18n/ContentLanguage";
import LocalizedField from "../../shared/i18n/LocalizedField";
import { lazy, Suspense, useState } from "react";
import { useEditorBuffer } from "../../shared/content/editor/EditorBuffer";
const RichEditor = lazy(() => import("../../shared/content/editor/RichEditor"));
import PairFields from "./PairFields";
import { useCatalogText } from "../../shared/i18n/catalog-i18n";
import { useInternationalText } from "../../shared/i18n/international-i18n";
import type { ProductDraft } from "./catalog-model";
import "../styles/international.css";
import { productRichContent } from "./product-content-model";
import { useProductContentText } from "./product-content-i18n";
import { editorDocument } from "../../shared/content/editor/rich-conversion";
type Props = {
  canWrite?: boolean;
  draft: ProductDraft;
  lang: string;
  onChange: (d: ProductDraft) => void;
};
function source(d: ProductDraft) {
  const main = d.mainLocale ?? "en-GB";
  return d.translations[main] ? main : main.split("-")[0];
}
export function ProductRich({
  draft: d,
  lang,
  onChange,
  canWrite = true,
}: Props) {
  const [reset, setReset] = useState(0);
  const { i, locale } = useInternationalText();
  const buffer = useEditorBuffer();
  const t = useProductContentText();
  const { key, main, isMain, fromShortText, map, inherited, blocks } =
    productRichContent(d, lang);
  const set = (value: any) =>
    onChange({ ...d, extra: { ...d.extra, richDescription: value } });
  if (!canWrite) return <RichDescription blocks={blocks} />;
  return (
    <div>
      <div className="product-rich-language">
        {!isMain && (
          <button
            type="button"
            disabled={buffer.pending}
            className="intl-inherit"
            aria-pressed={inherited}
            onClick={() => {
              const next = { ...map };
              if (inherited) next[key] = structuredClone(blocks);
              else delete next[key];
              set(next);
              setReset((n) => n + 1);
            }}
          >
            {fromShortText
              ? t("shortSource")
              : i(inherited ? "inheritedFrom" : "customText")}{" "}
            {inherited && !fromShortText
              ? (new Intl.DisplayNames([locale], { type: "language" }).of(
                  main,
                ) ?? main)
              : ""}{" "}
            ↗
          </button>
        )}
      </div>
      {inherited && (
        <p className="product-content-hint">
          {t(fromShortText ? "shortSourceHint" : "inheritedHint")}
        </p>
      )}
      <Suspense fallback={<p role="status">{i("loading")}</p>}>
        <RichEditor
          key={`${key}:${reset}`}
          language={key}
          value={{
            ...map,
            [key]: [{ type: "document", doc: editorDocument(blocks) }],
          }}
          onChange={set}
        />
      </Suspense>
    </div>
  );
}
export function ProductSpecifications({ draft: d, lang, onChange }: Props) {
  const { i } = useInternationalText();
  const main = source(d),
    map = d.extra.specifications ?? {},
    inherited = lang !== main && map[lang] == null;
  const set = (v: any) =>
    onChange({ ...d, extra: { ...d.extra, specifications: v } });
  return (
    <div>
      {lang !== main && (
        <button
          type="button"
          className="intl-inherit"
          aria-pressed={inherited}
          onClick={() => {
            const next = { ...map };
            if (inherited) next[lang] = structuredClone(map[main] ?? {});
            else delete next[lang];
            set(next);
          }}
        >
          {i(inherited ? "inheritedFrom" : "customText")}{" "}
          {inherited ? d.mainLocale : ""} ↗
        </button>
      )}
      <PairFields
        value={map[lang] ?? map[main] ?? {}}
        onChange={(value) => set({ ...map, [lang]: value })}
      />
    </div>
  );
}
export function ProductSeo({ draft: d, lang, onChange }: Props) {
  const { c } = useCatalogText();
  const main = source(d),
    seo = d.extra.seo?.[lang] ?? {},
    fallback = d.extra.seo?.[main] ?? {};
  return (
    <ContentLanguage
      locales={[...new Set([...Object.keys(d.translations), lang, main])]}
      mainLocale={main}
      language={lang}
    >
      <div className="catalog-form-grid">
        {(["title", "description", "slug"] as const).map((field) => (
          <LocalizedField
            key={field}
            label={c(field === "description" ? "metaDescription" : field)}
            maxLength={field === "description" ? 500 : 200}
            value={Object.fromEntries(
              Object.entries(d.extra.seo ?? {}).map(
                ([key, record]: [string, any]) => [key, record?.[field]],
              ),
            )}
            onChange={(next) =>
              onChange({
                ...d,
                extra: {
                  ...d.extra,
                  seo: Object.fromEntries(
                    [
                      ...new Set([
                        ...Object.keys(d.extra.seo ?? {}),
                        ...Object.keys(next),
                      ]),
                    ].map((key) => [
                      key,
                      { ...d.extra.seo?.[key], [field]: next[key] ?? null },
                    ]),
                  ),
                },
              })
            }
          />
        ))}
        <div className="catalog-seo-preview">
          <strong>
            {seo.title ??
              fallback.title ??
              d.translations[lang]?.name ??
              d.translations[main]?.name}
          </strong>
          <small>{`/products/${d.id}${(seo.slug ?? fallback.slug) ? `/${seo.slug ?? fallback.slug}` : ""}`}</small>
          <p>
            {seo.description ??
              fallback.description ??
              d.translations[lang]?.description ??
              d.translations[main]?.description}
          </p>
        </div>
      </div>
    </ContentLanguage>
  );
}

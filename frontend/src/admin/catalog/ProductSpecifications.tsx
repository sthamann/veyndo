/** Visible localized details, language-independent properties and unit-labelled dimensions edit the same native product aggregate. */
import { shopText } from "../../shared/i18n/shop-i18n";
import { useId } from "react";
import PairFields from "./PairFields";
import { contentKey, contentLocale } from "../../shared/i18n/content-language";
import {
  productSpecifications,
  type SpecificationMap,
} from "../../shared/content/product-specifications";
import { useInternationalText } from "../../shared/i18n/international-i18n";
import { useCatalogText } from "../../shared/i18n/catalog-i18n";
import { useProductSpecificationText } from "./product-specification-i18n";
import type { ProductDraft } from "./catalog-model";
import "../styles/product-specifications.css";
export default function ProductSpecifications({
  draft,
  lang,
  onChange,
  canWrite = true,
}: {
  draft: ProductDraft;
  lang: string;
  onChange: (draft: ProductDraft) => void;
  canWrite?: boolean;
}) {
  const t = useProductSpecificationText(),
    { i, locale } = useInternationalText(),
    { c } = useCatalogText(),
    id = useId();
  const main = draft.mainLocale ?? "en-GB",
    locales = draft.availableLocales ?? [main, lang],
    language = contentLocale(lang, locales);
  const map: SpecificationMap = draft.extra.specifications ?? {},
    key = contentKey(map, language, locales);
  const isMain = language === main,
    inherited = !isMain && map[key] == null;
  const effective = productSpecifications(map, language, main),
    editable = map[key] ?? effective;
  const s = shopText(language);
  const preview: Record<string, string> = {
    ...draft.commerce.properties,
    ...effective,
  };
  const set = (specifications: SpecificationMap) =>
    onChange({ ...draft, extra: { ...draft.extra, specifications } });
  return (
    <div className="product-specifications">
      <section aria-labelledby={`${id}-visible`}>
        <div className="product-spec-heading">
          <h3 id={`${id}-visible`}>{t("visible")}</h3>
          {!isMain && (
            <button
              type="button"
              disabled={!canWrite}
              className="intl-inherit"
              aria-pressed={inherited}
              onClick={() => {
                const next = { ...map };
                if (inherited) next[key] = structuredClone(effective);
                else delete next[key];
                set(next);
              }}
            >
              {i(inherited ? "inheritedFrom" : "customText")}{" "}
              {inherited
                ? new Intl.DisplayNames([locale], { type: "language" }).of(main)
                : ""}{" "}
              ↗
            </button>
          )}
        </div>
        <p className="product-spec-hint">
          {t("visibleHint")} {t("inheritance")}
        </p>
        <PairFields
          key={language}
          value={editable}
          disabled={!canWrite}
          onChange={(value) => set({ ...map, [key]: value })}
        />
        {!!Object.keys(preview).length && (
          <div className="product-spec-preview" aria-label={t("preview")}>
            <h4>{t("preview")}</h4>
            <dl>
              {Object.entries(preview).map(([name, value]) => (
                <div key={name}>
                  <dt>{s(name)}</dt>
                  <dd>{s(value)}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}
      </section>
      <section aria-labelledby={`${id}-properties`}>
        <h3 id={`${id}-properties`}>{t("properties")}</h3>
        <p className="product-spec-hint">{t("propertiesHint")}</p>
        <PairFields
          value={draft.commerce.properties ?? {}}
          disabled={!canWrite}
          onChange={(properties) =>
            onChange({ ...draft, commerce: { ...draft.commerce, properties } })
          }
        />
      </section>
      <section aria-labelledby={`${id}-dimensions`}>
        <h3 id={`${id}-dimensions`}>{t("dimensions")}</h3>
        <p className="product-spec-hint">{t("dimensionsHint")}</p>
        <div className="catalog-form-grid">
          {(["weight", "width", "height", "length"] as const).map((field) => (
            <label key={field}>
              {c(field)}
              <input
                type="number"
                disabled={!canWrite}
                min={0}
                step="0.01"
                value={draft.extra.automation?.[field] ?? ""}
                onChange={(e) => {
                  const automation = { ...draft.extra.automation };
                  if (e.target.value === "") delete automation[field];
                  else automation[field] = Number(e.target.value);
                  onChange({ ...draft, extra: { ...draft.extra, automation } });
                }}
              />
            </label>
          ))}
        </div>
      </section>
    </div>
  );
}

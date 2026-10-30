/** Single-language optional SEO edits share effective fields and encoded paths with the storefront; previewing never mutates the product draft. */
import { ContentLanguage } from "../../shared/i18n/ContentLanguage";
import LocalizedField from "../../shared/i18n/LocalizedField";
import {
  contentLocale,
  contentText,
  contentKey,
} from "../../shared/i18n/content-language";
import {
  productPath,
  productSeoIssue,
  productSeoFields,
  type ProductSeoMap,
} from "../../shared/content/product-seo";
import { useCatalogText } from "../../shared/i18n/catalog-i18n";
import { useProductSeoText } from "./product-seo-i18n";
import type { ProductDraft } from "./catalog-model";
import "../styles/product-seo.css";
export default function ProductSeo({
  draft,
  lang,
  onChange,
}: {
  draft: ProductDraft;
  lang: string;
  onChange: (draft: ProductDraft) => void;
}) {
  const { c } = useCatalogText(),
    t = useProductSeoText();
  const main = draft.mainLocale ?? "en-GB",
    locales = draft.availableLocales ?? [main, lang];
  const language = contentLocale(lang, locales);
  const map: ProductSeoMap = draft.extra.seo ?? {};
  const seo = productSeoFields(map, language, main);
  const fallback = (field: "name" | "description") =>
    contentText(
      Object.fromEntries(
        Object.entries(draft.translations).map(([key, record]) => [
          key,
          record[field],
        ]),
      ),
      language,
      main,
    );
  const title = seo.title ?? fallback("name"),
    description = seo.description ?? fallback("description");
  return (
    <ContentLanguage locales={locales} mainLocale={main} language={language}>
      <div className="product-seo-workspace">
        <div className="product-seo-fields">
          <p className="product-seo-hint">{t("inheritedHint")}</p>
          {(["title", "description", "slug"] as const).map((field) => {
            const max = field === "description" ? 500 : 200;
            const effective =
              field === "title"
                ? title
                : field === "description"
                  ? description
                  : (seo.slug ?? "");
            const fieldMap = Object.fromEntries(
              Object.entries(map).map(([key, value]) => [key, value?.[field]]),
            );
            const issue = productSeoIssue(
              field,
              fieldMap[contentKey(fieldMap, language, locales)],
            );
            return (
              <div className="product-seo-field" key={field}>
                <LocalizedField
                  label={
                    field === "slug"
                      ? t("slug")
                      : c(field === "description" ? "metaDescription" : "title")
                  }
                  multiline={field === "description"}
                  error={issue ? t(issue) : undefined}
                  maxLength={max}
                  externalFallback={effective}
                  externalLabel={t("automatic")}
                  value={Object.fromEntries(
                    Object.entries(map).map(([key, value]) => [
                      key,
                      value?.[field],
                    ]),
                  )}
                  onChange={(next) =>
                    onChange({
                      ...draft,
                      extra: {
                        ...draft.extra,
                        seo: Object.fromEntries(
                          [
                            ...new Set([
                              ...Object.keys(map),
                              ...Object.keys(next),
                            ]),
                          ].map((key) => [
                            key,
                            { ...map[key], [field]: next[key] ?? null },
                          ]),
                        ),
                      },
                    })
                  }
                />
                <small className="product-seo-count">
                  {t("characters", {
                    count: effective.length,
                    max,
                  })}
                </small>
                {field === "slug" && (
                  <p className="product-seo-hint">{t("slugHint")}</p>
                )}
              </div>
            );
          })}
        </div>
        <section className="product-seo-preview" aria-label={t("preview")}>
          <h3>{t("preview")}</h3>
          <p className="product-seo-hint">{t("previewHint")}</p>
          <div className="product-seo-result">
            <strong>{title || t("noTitle")}</strong>
            <span>
              {draft.id ? productPath(draft.id, seo.slug) : t("saveFirst")}
            </span>
            <p>{description || t("noDescription")}</p>
          </div>
        </section>
      </div>
    </ContentLanguage>
  );
}

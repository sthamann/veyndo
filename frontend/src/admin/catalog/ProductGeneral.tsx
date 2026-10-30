/** Product basics and full content remain primary; optional identifiers and shipping flags share one expandable native-draft section. */
import ProductTextFields from "./ProductTextFields";
import { ProductRich } from "./ProductLocalizedContent";
import { useCatalogText } from "../../shared/i18n/catalog-i18n";
import { useProductContentText } from "./product-content-i18n";
import type { ProductDraft } from "./catalog-model";
import "../styles/product-content.css";
export default function ProductGeneral({
  draft,
  lang,
  onChange,
  canWrite,
}: {
  draft: ProductDraft;
  lang: string;
  onChange: (draft: ProductDraft) => void;
  canWrite: boolean;
}) {
  const { c } = useCatalogText(),
    t = useProductContentText();
  const identity = draft.extra.identity ?? {};
  const hasDetails =
    Object.values(identity).some(Boolean) ||
    draft.extra.digital ||
    draft.extra.shippingFree;
  return (
    <div className="product-content-workspace">
      <ProductTextFields draft={draft} lang={lang} onChange={onChange} />
      <section className="product-content-description" aria-label={c("rich")}>
        <h3>{c("rich")}</h3>
        <p className="product-content-hint">{t("richHint")}</p>
        <ProductRich
          draft={draft}
          lang={lang}
          onChange={onChange}
          canWrite={canWrite}
        />
      </section>
      <details
        className="product-content-details"
        open={hasDetails || undefined}
      >
        <summary>{t("details")}</summary>
        <p className="product-content-hint">{t("detailsHint")}</p>
        <div className="catalog-form-grid">
          {(["manufacturer", "manufacturerNumber", "ean"] as const).map(
            (key) => (
              <label key={key}>
                {c(key)}
                <input
                  value={identity[key] ?? ""}
                  onChange={(event) =>
                    onChange({
                      ...draft,
                      extra: {
                        ...draft.extra,
                        identity: { ...identity, [key]: event.target.value },
                      },
                    })
                  }
                />
              </label>
            ),
          )}
        </div>
        <div className="catalog-flags">
          {(["digital", "shippingFree"] as const).map((key) => (
            <label className="checkbox-label" key={key}>
              <input
                type="checkbox"
                checked={!!draft.extra[key]}
                onChange={(event) =>
                  onChange({
                    ...draft,
                    extra: { ...draft.extra, [key]: event.target.checked },
                  })
                }
              />
              {c(key)}
            </label>
          ))}
        </div>
      </details>
    </div>
  );
}

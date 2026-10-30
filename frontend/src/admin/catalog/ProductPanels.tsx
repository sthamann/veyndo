/** Native commerce, media, translated SEO/specifications and category panels for one editable product. */
import ProductPricing from "./ProductPricing";
import ProductAssignments from "./ProductAssignments";
import type { RequestFn } from "../shell/studio-types";
import { useCatalogText } from "../../shared/i18n/catalog-i18n";
import type { Category, ProductDraft } from "./catalog-model";
import PairFields from "./PairFields";

import { ProductSeo, ProductSpecifications } from "./ProductLocalizedContent";
import ProductGeneral from "./ProductGeneral";
export default function ProductPanels({
  request,
  tab,
  draft,
  lang,
  categories,
  onChange,
  canWrite = true,
}: {
  canWrite?: boolean;
  request: RequestFn;
  tab: string;
  draft: ProductDraft;
  lang: string;
  categories: Category[];
  onChange: (d: ProductDraft) => void;
}) {
  const { c } = useCatalogText();
  const d = draft;
  const extra = (v: any) => onChange({ ...d, extra: { ...d.extra, ...v } });
  if (tab === "general")
    return (
      <ProductGeneral
        draft={draft}
        lang={lang}
        onChange={onChange}
        canWrite={canWrite}
      />
    );
  if (tab === "prices")
    return (
      <ProductPricing request={request} draft={draft} onChange={onChange} />
    );
  if (tab === "assignments")
    return (
      <ProductAssignments
        draft={draft}
        categories={categories}
        language={lang}
        canWrite={canWrite}
        onChange={onChange}
      />
    );
  if (tab === "specs")
    return (
      <>
        <h2>
          {c("specs")} · {lang.toUpperCase()}
        </h2>
        <ProductSpecifications draft={d} lang={lang} onChange={onChange} />
        <h2>{c("key")}</h2>
        <PairFields
          value={d.commerce.properties}
          onChange={(properties) =>
            onChange({ ...d, commerce: { ...d.commerce, properties } })
          }
        />
        <div className="catalog-form-grid">
          {(["weight", "width", "height", "length"] as const).map((k) => (
            <label key={k}>
              {c(k)}
              <input
                type="number"
                min={0}
                step="0.01"
                value={d.extra.automation?.[k] ?? ""}
                onChange={(e) => {
                  const automation = { ...d.extra.automation };
                  if (e.target.value === "") delete automation[k];
                  else automation[k] = Number(e.target.value);
                  extra({ automation });
                }}
              />
            </label>
          ))}
        </div>
      </>
    );
  if (tab === "seo")
    return <ProductSeo draft={d} lang={lang} onChange={onChange} />;
  return null;
}

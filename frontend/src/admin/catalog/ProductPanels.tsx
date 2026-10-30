/** Native commerce, media, translated SEO/specifications and category panels for one editable product. */
import ProductPricing from "./ProductPricing";
import ProductAssignments from "./ProductAssignments";
import type { RequestFn } from "../shell/studio-types";
import type { Category, ProductDraft } from "./catalog-model";
import ProductSpecifications from "./ProductSpecifications";

import ProductGeneral from "./ProductGeneral";
import ProductSeo from "./ProductSeo";
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
  const d = draft;
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
      <ProductSpecifications
        draft={d}
        lang={lang}
        onChange={onChange}
        canWrite={canWrite}
      />
    );
  if (tab === "seo")
    return <ProductSeo draft={d} lang={lang} onChange={onChange} />;
  return null;
}

/** Shared native product information; callers own transport and explicit content-language context. */
import type { ReactNode } from "react";
import type { Product } from "../../shared/api/shop-api";
import { useShopText } from "../../shared/i18n/shop-i18n";
import { productSpecifications } from "../../shared/content/product-specifications";
import RichDescription from "../../shared/content/RichDescription";
import ProductSafety from "../legal/ProductSafety";
import { BRAND } from "../../shared/ui/Brand";

export default function ProductInformation({
  product: p,
  language,
  mainLocale,
  attachments,
}: {
  product: Product;
  language: string;
  mainLocale: string;
  attachments?: ReactNode;
}) {
  const { s } = useShopText();
  const rich = p.extra?.richDescription;
  const blocks =
    rich?.[language] ??
    rich?.[language.split("-")[0]] ??
    rich?.[mainLocale] ??
    rich?.[mainLocale.split("-")[0]];
  const specs = productSpecifications(
    p.extra?.specifications,
    language,
    mainLocale,
  );
  return (
    <>
      <div className="pdp-details">
        <section>
          <h2>{s("description")}</h2>
          {Array.isArray(blocks) ? (
            <RichDescription blocks={blocks} />
          ) : (
            <p>{p.description}</p>
          )}
          {attachments}
          <p className="product-material">
            {s(p.properties.material ?? "")} · {BRAND.name} /
          </p>
        </section>
        <section>
          <h2>{s("properties")}</h2>
          <dl>
            {Object.entries({ ...p.properties, ...specs }).map(
              ([key, value]) => (
                <div key={key}>
                  <dt>{s(key)}</dt>
                  <dd>{s(value)}</dd>
                </div>
              ),
            )}
          </dl>
        </section>
      </div>
      <ProductSafety
        value={p.extra?.compliance}
        language={language}
        mainLocale={mainLocale}
      />
    </>
  );
}

/** Merchant-selected recommendations use native channel/buyer-aware detail reads and the existing product tile; hidden or removed products never become ID links. */
import { useEffect, useState } from "react";
import {
  shopApi,
  getContentLocale,
  type Cart,
  type Detail,
} from "../../shared/api/shop-api";
import { shopScope } from "../../shared/api/shop-scope";
import { useShopText } from "../../shared/i18n/shop-i18n";
import { useAppText } from "../../shared/i18n/app-i18n";
import ProductTile from "../shell/ProductTile";
import "../styles/cross-selling.css";
export default function CrossSelling({
  ids,
  sourceId,
  cart,
}: {
  ids: string[];
  sourceId: string;
  cart?: Cart | null;
}) {
  const { money, locale, currency } = useShopText(),
    { a } = useAppText();
  const selected = [...new Set(ids)]
    .filter((id) => typeof id === "string" && id !== sourceId)
    .slice(0, 20);
  const context = JSON.stringify([
    shopScope(),
    sourceId,
    selected,
    getContentLocale(),
    locale,
    currency,
    cart?.token,
    cart?.revision,
    cart?.customerId,
    cart?.customerGroup,
    cart?.checkout.country,
    cart?.price.currency,
    cart?.b2b?.unitId,
  ]);
  const [loaded, setLoaded] = useState<{
    context: string;
    products: Detail[];
  }>();
  useEffect(() => {
    let active = true;
    const run = async () => {
      const products: Detail[] = [];
      for (let offset = 0; offset < selected.length && active; offset += 4) {
        const batch = selected.slice(offset, offset + 4);
        const values = await Promise.allSettled(
          batch.map((id) =>
            shopApi<Detail>(
              `/store-api/product/${encodeURIComponent(id)}`,
              {},
              cart?.token,
            ),
          ),
        );
        values.forEach((v, index) => {
          if (v.status === "fulfilled" && v.value.product.id === batch[index])
            products.push(v.value);
        });
      }
      if (active) setLoaded({ context, products });
    };
    void run();
    return () => {
      active = false;
    };
  }, [context]);
  if (loaded?.context !== context || !loaded.products.length) return null;
  return (
    <section className="cross-selling-products" aria-label={a("recommended")}>
      <h2>{a("recommended")}</h2>
      <div className="shop-grid">
        {loaded.products.map((d) => (
          <ProductTile
            key={d.product.id}
            product={{
              ...d.product,
              calculated_price:
                d.calculatedPrices[0]?.price ?? d.product.calculated_price,
            }}
            money={money}
            business={d.taxStatus === "net"}
          />
        ))}
      </div>
    </section>
  );
}

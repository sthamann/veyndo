/** Native gallery and purchase presentation use a scoped read without shopper sessions, analytics or app actions. */
import { useEffect, useRef, useState } from "react";
import type { RequestFn } from "../../../../frontend/src/shared/api/types";
import type { Detail } from "../../../../frontend/src/shared/api/shop-api";
import { useShopText } from "../../../../frontend/src/shared/i18n/shop-i18n";
import ProductGallery from "../../../../frontend/src/storefront/catalog/ProductGallery";
import ProductPurchase from "../../../../frontend/src/storefront/catalog/ProductPurchase";
import NativeProductDetails from "./NativeProductDetails";
import { useOverviewText } from "./overview-i18n";

type Props = {
  id: string;
  request: RequestFn;
  workspace: string;
  channel: string;
  language: string;
  mainLocale: string;
};
export default function NativeProductPreview(props: Props) {
  const t = useOverviewText();
  const { s, locale } = useShopText();
  const { id, request, workspace, channel, language } = props;
  const scope = `${workspace}:${channel}:${language}:${id}`;
  const [attempt, retry] = useState(0);
  const [result, setResult] = useState<{
    scope: string;
    request: RequestFn;
    data?: Detail;
    error?: string;
  }>();
  const [image, setImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const detailRequest = useRef(0);
  useEffect(() => {
    let active = true;
    setResult(undefined);
    setImage(0);
    void request(`/store-api/product/${encodeURIComponent(id)}`, {}, "POST", {
      salesChannel: channel === "*" ? "default" : channel,
      locale: language,
    })
      .then((data: Detail) => {
        if (!active) return;
        setQuantity(data.product.min_purchase);
        setResult({ scope, request, data });
      })
      .catch((error: Error) => {
        if (active) setResult({ scope, request, error: error.message });
      });
    return () => {
      active = false;
    };
  }, [scope, request, attempt]);
  const current =
    result?.scope === scope && result.request === request ? result : undefined;
  const data = current?.data;
  if (!data)
    return (
      <main className="shop-content is-design-preview">
        <p role={current?.error ? "alert" : "status"}>
          {current?.error || s("loading")}
        </p>
        {current?.error && (
          <button type="button" onClick={() => retry(attempt + 1)}>
            {t("retry")}
          </button>
        )}
      </main>
    );
  const p = data.product;
  const tier = data.calculatedPrices[0];
  if (!tier) return <p role="alert">{t("productUnavailable")}</p>;
  return (
    <main className="shop-content pdp is-design-preview">
      <div className="pdp-main">
        <ProductGallery p={p} image={image} setImage={setImage} />
        <ProductPurchase
          preview
          s={s}
          p={p}
          data={data}
          money={(value) =>
            new Intl.NumberFormat(locale, {
              style: "currency",
              currency: p.currency ?? "EUR",
            }).format(value)
          }
          tier={tier}
          groups={[
            ...new Set(
              data.variants.flatMap((variant) => Object.keys(variant.options)),
            ),
          ]}
          variantsLoading={false}
          detailRequest={detailRequest}
          setVariantsLoading={() => {}}
          id={p.id}
          cart={undefined}
          setData={() => {}}
          setError={() => {}}
          onConfigure={async () => undefined}
          quantity={quantity}
          setQuantity={setQuantity}
          effective={p.min_purchase}
          busy
          onAdd={() => {}}
        />
      </div>
      <NativeProductDetails
        key={`${scope}:${attempt}`}
        {...props}
        data={data}
      />
    </main>
  );
}

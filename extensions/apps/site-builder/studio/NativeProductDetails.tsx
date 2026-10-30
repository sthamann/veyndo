/** Native lower product presentation with private attachment reads and no shopper, download or consent actions. */
import { useEffect, useState, type MouseEvent } from "react";
import type { RequestFn } from "../../../../frontend/src/shared/api/types";
import type { Detail } from "../../../../frontend/src/shared/api/shop-api";
import ProductInformation from "../../../../frontend/src/storefront/catalog/ProductInformation";
import PublishedReviews from "../../../../frontend/src/storefront/catalog/PublishedReviews";
import AttachmentList, {
  type ProductAttachment,
} from "../../../../frontend/src/storefront/catalog/AttachmentList";
import { useOverviewText } from "./overview-i18n";

export default function NativeProductDetails({
  data,
  request,
  workspace,
  channel,
  language,
  mainLocale,
}: {
  data: Detail;
  request: RequestFn;
  workspace: string;
  channel: string;
  language: string;
  mainLocale: string;
}) {
  const t = useOverviewText();
  const scope = `${workspace}:${channel}:${language}:${data.product.id}`;
  const [attempt, retry] = useState(0);
  const [result, setResult] = useState<{
    scope: string;
    request: RequestFn;
    files: ProductAttachment[];
    error?: string;
  }>();
  useEffect(() => {
    let active = true;
    setResult(undefined);
    void request(
      `/store-api/product/${encodeURIComponent(data.product.id)}/attachments`,
      undefined,
      "GET",
      {
        salesChannel: channel === "*" ? "default" : channel,
        locale: language,
      },
    )
      .then((value) => {
        if (active) setResult({ scope, request, files: value.elements });
      })
      .catch((error: Error) => {
        if (active)
          setResult({ scope, request, files: [], error: error.message });
      });
    return () => {
      active = false;
    };
  }, [scope, request, attempt]);
  const current =
    result?.scope === scope && result.request === request ? result : undefined;
  const preventAction = (event: MouseEvent<HTMLDivElement>) => {
    if ((event.target as Element).closest("a,button,video")) {
      event.preventDefault();
      event.stopPropagation();
    }
  };
  return (
    <>
      <div onClickCapture={preventAction} onAuxClickCapture={preventAction}>
        <ProductInformation
          product={data.product}
          language={language}
          mainLocale={mainLocale}
          attachments={
            <AttachmentList
              files={current?.files ?? []}
              language={language}
              mainLocale={mainLocale}
              error={current?.error}
            />
          }
        />
      </div>
      {!current && <p role="status">{t("loadingAttachments")}</p>}
      {current?.error && (
        <button type="button" onClick={() => retry(attempt + 1)}>
          {t("retryAttachments")}
        </button>
      )}
      <section className="pdp-reviews">
        <PublishedReviews reviews={data.reviews} />
      </section>
    </>
  );
}

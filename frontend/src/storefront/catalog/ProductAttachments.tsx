/** Public attachment list follows the active storefront tenant and channel; private downloads are never listed. */
import { shopScope } from "../../shared/api/shop-scope";
import { useEffect, useState } from "react";
import { downloadFile } from "../../shared/api/download";
import { getContentLocale, shopApi } from "../../shared/api/shop-api";
import { useOperationsText } from "../../shared/i18n/operations-i18n";
import { useLegalPolicy } from "../legal/PrivacyProvider";
import AttachmentList, { type ProductAttachment } from "./AttachmentList";
export default function ProductAttachments({ id }: { id: string }) {
  const { locale } = useOperationsText();
  const policy = useLegalPolicy();
  const [files, setFiles] = useState<ProductAttachment[]>([]),
    [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    setFiles([]);
    setError("");
    shopApi<{ elements: ProductAttachment[] }>(
      `/store-api/product/${encodeURIComponent(id)}/attachments`,
    )
      .then((v) => {
        if (active) setFiles(v.elements);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [id, locale]);
  const query = new URLSearchParams(location.search);
  return (
    <AttachmentList
      files={files}
      language={getContentLocale()}
      mainLocale={policy?.mainLocale ?? getContentLocale()}
      error={error}
      onDownload={(asset) =>
        void downloadFile(`/store-api/assets/${asset}`, {
          "x-tenant": shopScope(),
          ...(query.get("channel")
            ? { "sw-sales-channel-id": query.get("channel")! }
            : {}),
        }).catch((e) => setError(e.message))
      }
    />
  );
}

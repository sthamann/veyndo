/** Present public attachment metadata; downloading requires an explicit callback from the live storefront. */
import {
  contentText,
  type LocalizedText,
} from "../../shared/i18n/content-language";
import { useOperationsText } from "../../shared/i18n/operations-i18n";
import "./product-attachments.css";
export type ProductAttachment = {
  id: string;
  name?: string;
  title?: LocalizedText;
  filename: string;
};
export default function AttachmentList({
  files,
  language,
  mainLocale,
  onDownload,
  error,
}: {
  files: ProductAttachment[];
  language: string;
  mainLocale: string;
  onDownload?: (id: string) => void;
  error?: string;
}) {
  const { o } = useOperationsText();
  if (!files.length && !error) return null;
  return (
    <section className="shop-detail-section product-attachments">
      <h2>{o("assets")}</h2>
      {files.map((file) => (
        <button
          type="button"
          key={file.id}
          className="shop-secondary"
          disabled={!onDownload}
          onClick={() => onDownload?.(file.id)}
        >
          {file.name ?? contentText(file.title ?? {}, language, mainLocale)} ·{" "}
          {file.filename}
        </button>
      ))}
      {error && <p role="alert">{error}</p>}
    </section>
  );
}

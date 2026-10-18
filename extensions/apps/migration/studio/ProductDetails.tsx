/** Merchant-readable variant evidence is displayed before the exact source-page approval. */
import type { SourceRecord } from "./model";
import { useProductText } from "./product-i18n";
export default function ProductDetails({ row }: { row: SourceRecord }) {
  const t = useProductText(),
    d = row.data;
  return (
    <div className="migration-source-detail">
      {d.variantGroup && <strong>{t("family")}</strong>}
      {d.options && Object.keys(d.options).length > 0 && (
        <ul>
          {Object.entries(d.options).map(([name, value]) => (
            <li key={name}>
              {name}: {value}
            </li>
          ))}
        </ul>
      )}
      <p>
        {t(
          d.catalogActive === false
            ? "hidden"
            : d.catalogActive === true
              ? "visible"
              : "unknown",
        )}
      </p>
      <dl>
        {d.parentSourceId && (
          <>
            <dt>{t("parent")}</dt>
            <dd>{d.parentSourceId}</dd>
          </>
        )}
        {d.sku && (
          <>
            <dt>{t("sku")}</dt>
            <dd>{d.sku}</dd>
          </>
        )}
        {typeof d.stock === "number" && (
          <>
            <dt>{t("stock")}</dt>
            <dd>{d.stock}</dd>
          </>
        )}
      </dl>
      <small>{t("target")}</small>
    </div>
  );
}

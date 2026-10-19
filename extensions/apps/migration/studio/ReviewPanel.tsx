/** Exact source review keeps unacknowledged gaps and missing target choices from starting a write. */
import { useProgressText } from "./run-progress-i18n";
import ExportEvidence from "./ExportEvidence";
import PriceOptions from "./PriceOptions";
import { usePriceText } from "./price-i18n";
import SourceDetails from "./SourceDetails";
import { useState } from "react";
import Icon from "../../../../frontend/src/shared/ui/Icon";
import { useLocale } from "../../../../frontend/src/shared/i18n/i18n";
import type { CustomerGroup } from "../../../../frontend/src/shared/customer/customer-types";
import { inheritedText } from "../../../../frontend/src/shared/geography/geography-types";
import { useMigrationText } from "./i18n";
import {
  reviewPriceBasis,
  rowName,
  rowAmount,
  type Review,
  type Kind,
} from "./model";
function SourceImage({ url, name }: { url: string; name: string }) {
  const [failed, setFailed] = useState(false);
  const t = useMigrationText();
  return failed ? (
    <span className="migration-image-fallback">
      <Icon name="image" />
      <small>{t("imagePreviewUnavailable")}</small>
    </span>
  ) : (
    <img
      className="migration-image"
      src={url}
      alt={name}
      referrerPolicy="no-referrer"
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}
export default function ReviewPanel({
  review,
  kind,
  tax,
  priceBasis,
  setPriceBasis,
  setTax,
  group,
  setGroup,
  groups,
  approved,
  setApproved,
  busy,
  canImport,
  start,
  mainLocale,
}: {
  review: Review;
  kind: Kind;
  tax: string;
  priceBasis: string;
  setPriceBasis: (value: string) => void;
  setTax: (v: string) => void;
  group: string;
  setGroup: (v: string) => void;
  groups: CustomerGroup[];
  approved: boolean;
  setApproved: (v: boolean) => void;
  busy: boolean;
  canImport: boolean;
  start: () => Promise<void>;
  mainLocale: string;
}) {
  const t = useMigrationText(),
    { locale } = useLocale();
  const priceText = usePriceText();
  const progressText = useProgressText();
  const hasAmount = ["products", "orders", "assets", "coupons"].includes(kind);
  const unresolvedWarnings = review.records.some((row) =>
    row.warnings.some((w) => w !== "source_price_tax_basis_requires_review"),
  );
  const hasWarnings = review.records.some((row) => row.warnings.length > 0);
  return (
    <>
      {review.sourceExport && <ExportEvidence source={review.sourceExport} />}
      <p>
        {review.sourceVersion} · {review.records.length}
      </p>
      {!review.records.length && <p>{progressText("empty")}</p>}
      <div className="migration-table">
        <table>
          <colgroup>
            <col style={{ width: "16%" }} />
            <col />
            {hasAmount && <col style={{ width: "20%" }} />}
            {hasWarnings && <col style={{ width: "24%" }} />}
          </colgroup>
          <thead>
            <tr>
              <th>{t("sourceKey")}</th>
              <th>{t("name")}</th>
              {hasAmount && (
                <th>{t(kind === "assets" ? "imageSize" : "amount")}</th>
              )}
              {hasWarnings && <th>{t("limitations")}</th>}
            </tr>
          </thead>
          <tbody>
            {review.records.map((row) => (
              <tr key={row.sourceId}>
                <td>
                  <details className="migration-source-id">
                    <summary>
                      {row.sourceId.length > 32
                        ? row.sourceId.slice(0, 20) + "…"
                        : row.sourceId}
                    </summary>
                    <code>{row.sourceId}</code>
                  </details>
                </td>
                <td className="migration-content-cell">
                  {kind === "assets" && row.data.url && (
                    <SourceImage
                      key={row.data.url}
                      url={row.data.url}
                      name={rowName(row)}
                    />
                  )}{" "}
                  {rowName(row)}
                  <SourceDetails row={row} />
                </td>
                {hasAmount && (
                  <td>
                    {kind === "assets" ? row.data.byteLength : rowAmount(row)}
                  </td>
                )}
                {hasWarnings && (
                  <td>
                    {row.warnings
                      .map((w) =>
                        w === "source_price_tax_basis_requires_review"
                          ? priceText("taxWarning")
                          : w,
                      )
                      .join(" · ")}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {kind === "products" && !!review.records.length && (
        <PriceOptions
          value={priceBasis}
          locked={!!reviewPriceBasis(review)}
          onChange={(value) => {
            setPriceBasis(value);
            setApproved(false);
          }}
        />
      )}
      {kind === "products" && !!review.records.length && (
        <label>
          {t("tax")}
          <input
            aria-label={t("tax")}
            type="number"
            min="0"
            max="50"
            step="0.01"
            value={tax}
            onChange={(e) => {
              setTax(e.target.value);
              setApproved(false);
            }}
          />
          <small>{t("taxHint")}</small>
        </label>
      )}
      {kind === "customers" && !!review.records.length && (
        <label>
          {t("group")}
          <select
            value={group}
            onChange={(e) => {
              setGroup(e.target.value);
              setApproved(false);
            }}
          >
            <option value="" />
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {inheritedText(g.translations, locale, mainLocale, "name") ||
                  g.id}
              </option>
            ))}
          </select>
        </label>
      )}
      <label className="migration-approval">
        <input
          type="checkbox"
          checked={approved}
          onChange={(e) => setApproved(e.target.checked)}
        />
        {t("approve")}
      </label>
      <button
        className="studio-primary"
        disabled={
          busy ||
          !approved ||
          !canImport ||
          unresolvedWarnings ||
          (!!review.records.length &&
            kind === "products" &&
            (!tax ||
              !Number.isFinite(Number(tax)) ||
              Number(tax) < 0 ||
              Number(tax) > 50)) ||
          (!!review.records.length && kind === "customers" && !group)
        }
        onClick={() => void start()}
      >
        {review.records.length
          ? t(busy ? "busy" : "start")
          : progressText("acceptEmpty")}
      </button>
      {!canImport && <p>{t("denied")}</p>}
    </>
  );
}

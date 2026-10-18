/** Exact source review keeps unacknowledged gaps and missing target choices from starting a write. */
import { useLocale } from "../../../../frontend/src/shared/i18n/i18n";
import { contentText } from "../../../../frontend/src/shared/i18n/content-language";
import { useMigrationText } from "./i18n";
import { rowName, rowAmount, type Review, type Kind } from "./model";
export default function ReviewPanel({
  review,
  kind,
  tax,
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
  setTax: (v: string) => void;
  group: string;
  setGroup: (v: string) => void;
  groups: { id: string; name: Record<string, string> }[];
  approved: boolean;
  setApproved: (v: boolean) => void;
  busy: boolean;
  canImport: boolean;
  start: () => Promise<void>;
  mainLocale: string;
}) {
  const t = useMigrationText(),
    { locale } = useLocale();
  return (
    <>
      <p>
        {review.sourceVersion} · {review.records.length}
      </p>
      <div className="migration-table">
        <table>
          <thead>
            <tr>
              <th>{t("sourceKey")}</th>
              <th>{t("name")}</th>
              <th>{t("amount")}</th>
              <th>{t("limitations")}</th>
            </tr>
          </thead>
          <tbody>
            {review.records.map((row) => (
              <tr key={row.sourceId}>
                <td>{row.sourceId}</td>
                <td>{rowName(row)}</td>
                <td>{rowAmount(row)}</td>
                <td>{row.warnings.join(" · ")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {kind === "products" && (
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
      {kind === "customers" && (
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
                {contentText(g.name, locale, mainLocale) || g.id}
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
          !review.records.length ||
          review.records.some((r) => r.warnings.length > 0) ||
          (kind === "products" &&
            (!tax ||
              !Number.isFinite(Number(tax)) ||
              Number(tax) < 0 ||
              Number(tax) > 50)) ||
          (kind === "customers" && !group)
        }
        onClick={() => void start()}
      >
        {t(busy ? "busy" : "start")}
      </button>
      {!canImport && <p>{t("denied")}</p>}
    </>
  );
}

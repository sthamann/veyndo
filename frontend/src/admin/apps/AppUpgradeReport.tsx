/** Display only native admission metadata; a report is never an installation permission. */
import { useUpgradeText } from "./upgrade-i18n";
import { responseError } from "../../shared/i18n/errors-i18n";
export type UpgradeReport = {
  ready: boolean;
  migrationRequired: boolean;
  migrationSteps: number;
  models: { name: string; records: number }[];
  issue: { detail?: string; pointer?: string; kind?: string } | null;
};
export default function AppUpgradeReport({
  report,
}: {
  report: UpgradeReport;
}) {
  const t = useUpgradeText();
  return (
    <section className="app-upgrade-report" aria-label={t("title")}>
      <h3>{t(report.ready ? "ready" : "blocked")}</h3>
      <p>{t("hint")}</p>
      {report.migrationRequired && (
        <p>
          <strong>{t("migration")}</strong> · {t("steps")}:{" "}
          {report.migrationSteps}
        </p>
      )}
      {!!report.models.length && (
        <dl aria-label={t("records")}>
          {report.models.map((m) => (
            <div key={m.name}>
              <dt>{m.name}</dt>
              <dd>
                {m.records} · {t("records")}
              </dd>
            </div>
          ))}
        </dl>
      )}
      {report.issue && (
        <div>
          <p role="alert">
            {
              responseError(report.issue.detail ?? "", 400, report.issue)
                .message
            }
            {report.issue.pointer && <code>{report.issue.pointer}</code>}
          </p>
          <details>
            <summary>{t("diagnostic")}</summary>
            <code>{report.issue.detail}</code>
          </details>
        </div>
      )}
    </section>
  );
}

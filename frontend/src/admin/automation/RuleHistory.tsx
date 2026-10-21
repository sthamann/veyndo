/** Bounded read-only comparison; stale responses cannot cross a rule or workspace. */
import { useEffect, useRef, useState } from "react";
import type { RequestFn } from "../shell/studio-types";
import type { Config } from "./automation-types";
import { useContentLanguage } from "../../shared/i18n/ContentLanguage";
import { contentText } from "../../shared/i18n/content-language";
import { useRuleHistoryText } from "./rule-history-i18n";
import "./rule-history.css";
type Row = {
  jobId: string;
  status: string;
  capturedAt?: string;
  before?: boolean;
  after?: boolean;
  snapshotDigest?: string;
};
type Report = {
  sampled: number;
  evaluated: number;
  changed: number;
  unavailable: number;
  revision: number;
  baselineDigest: string;
  candidateDigest: string;
  results: Row[];
};
export default function RuleHistory({
  request,
  id,
  revision,
  condition,
  flows,
  advanced,
}: {
  request: RequestFn;
  id: string;
  revision: number;
  condition: unknown;
  flows: Config[];
  advanced: boolean;
}) {
  const t = useRuleHistoryText();
  const { mainLocale, language } = useContentLanguage();
  const [flow, setFlow] = useState("");
  const [limit, setLimit] = useState(25);
  const [report, setReport] = useState<Report | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const epoch = useRef(0);
  const serialized = JSON.stringify(condition);
  useEffect(() => {
    epoch.current++;
    setReport(null);
    setError(false);
    setBusy(false);
    return () => {
      epoch.current++;
    };
  }, [request, id, revision, serialized, flow, limit, advanced]);
  useEffect(() => {
    setFlow("");
  }, [request, id]);
  async function compare() {
    const ticket = ++epoch.current;
    setBusy(true);
    setError(false);
    setReport(null);
    try {
      const result = await request("/api/automation/rules/compare-history", {
        ruleId: id,
        revision,
        flowId: flow,
        condition,
        limit,
      });
      if (ticket === epoch.current) setReport(result);
    } catch {
      if (ticket === epoch.current) setError(true);
    } finally {
      if (ticket === epoch.current) setBusy(false);
    }
  }
  return (
    <details className="rule-history">
      <summary>{t("title")}</summary>
      <p>{t("hint")}</p>
      <p className="muted">{t("sample")}</p>
      {!revision ? (
        <p>{t("save")}</p>
      ) : advanced ? (
        <p>{t("advanced")}</p>
      ) : (
        <>
          <div className="rule-history-controls">
            <label>
              {t("flow")}
              <select value={flow} onChange={(e) => setFlow(e.target.value)}>
                <option value="">{t("choose")}</option>
                {flows.map((f) => (
                  <option key={f.id} value={f.id}>
                    {contentText(f.data.name, language, mainLocale) || f.id}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {t("limit")}
              <select
                value={limit}
                onChange={(e) => setLimit(Number(e.target.value))}
              >
                {[10, 25, 50].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <button
            type="button"
            className="studio-secondary"
            disabled={busy || !flow}
            onClick={() => void compare()}
          >
            {t(busy ? "running" : "run")}
          </button>
        </>
      )}
      {error && <p role="alert">{t("error")}</p>}
      {report && (
        <section aria-live="polite">
          {report.sampled === 0 ? (
            <p>{t("empty")}</p>
          ) : (
            <>
              <dl className="rule-history-counts">
                {(["evaluated", "changed", "unavailable"] as const).map((k) => (
                  <div key={k}>
                    <dt>{t(k === "evaluated" ? "checked" : k)}</dt>
                    <dd>{report[k]}</dd>
                  </div>
                ))}
              </dl>
              <div className="rule-history-table">
                <table>
                  <thead>
                    <tr>
                      <th>{t("captured")}</th>
                      <th>{t("before")}</th>
                      <th>{t("after")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.results.map((r) => (
                      <tr key={r.jobId}>
                        <td>{r.capturedAt ?? t("unavailable")}</td>
                        {r.status === "evaluated" ? (
                          <>
                            <td>{t(r.before ? "yes" : "no")}</td>
                            <td>{t(r.after ? "yes" : "no")}</td>
                          </>
                        ) : (
                          <td colSpan={2}>{t("missing")}</td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <details>
                <summary>{t("evidence")}</summary>
                <code className="rule-history-digest">
                  {report.revision} · {report.baselineDigest} →{" "}
                  {report.candidateDigest}
                </code>
              </details>
            </>
          )}
        </section>
      )}
    </details>
  );
}

/** Native findings stay separate from simulated customer reasoning. */
import { useScenarioText, type ScenarioWord } from "./scenario-i18n";
import type { Report, Run } from "./scenario-types";
import ScenarioEvidence from "./ScenarioEvidence";
import ScenarioSource from "./ScenarioSource";
export default function ScenarioReport({
  report,
  onControl,
}: {
  report: Report;
  onControl?: (run: Run, action: "cancel" | "resume") => void;
}) {
  const t = useScenarioText();
  const state = (s: string) =>
    t(
      ([
        "queued",
        "running",
        "uncertain",
        "failed",
        "cancelled",
        "ready",
      ].includes(s)
        ? s
        : "failed") as ScenarioWord,
    );
  return (
    <div className="scenario-results">
      {[...report.runs]
        .sort((a, b) => (a.scenario?.index ?? 0) - (b.scenario?.index ?? 0))
        .map((run) => {
          const finding = run.preview?.scenario,
            profile = finding?.profile ?? run.scenario?.profile,
            steps = finding?.steps ?? run.scenario?.steps;
          return (
            <article className="scenario-result" key={run.taskId}>
              <header>
                <strong>{profile?.name ?? t("profile")}</strong>
                <span
                  className={`scenario-state is-${finding?.outcome ?? run.state}`}
                >
                  {finding
                    ? t(
                        (finding.outcome === "purchased"
                          ? "purchase"
                          : finding.outcome) as ScenarioWord,
                      )
                    : state(run.state)}
                </span>
              </header>
              <ScenarioEvidence run={run} />
              {run.scenario?.source && (
                <ScenarioSource taskId={run.scenario.source.taskId} />
              )}
              {run.error && <p role="alert">{run.error.detail}</p>}
              {steps && (
                <ol>
                  {steps.map((step) => (
                    <li key={step.index}>
                      <strong>{t(step.action as ScenarioWord)}</strong>
                      <p>{step.reason}</p>
                      {step.error && (
                        <p className="scenario-error">{step.error.detail}</p>
                      )}
                    </li>
                  ))}
                </ol>
              )}
              {finding?.orderId && (
                <p>
                  {t("testOrder")}: <code>{finding.orderId}</code>
                  {finding.totalMinor != null &&
                    ` · ${(finding.totalMinor / 10 ** (finding.scale ?? 2)).toFixed(finding.scale ?? 2)} ${finding.currency ?? ""}`}
                </p>
              )}
              {onControl && ["queued", "running"].includes(run.state) && (
                <button
                  className="studio-secondary"
                  onClick={() => onControl(run, "cancel")}
                >
                  {t("cancel")}
                </button>
              )}
              {onControl && ["uncertain", "failed"].includes(run.state) && (
                <button
                  className="studio-secondary"
                  onClick={() => onControl(run, "resume")}
                >
                  {t("resume")}
                </button>
              )}
            </article>
          );
        })}
    </div>
  );
}

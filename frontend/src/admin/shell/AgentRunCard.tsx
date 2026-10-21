/** Saved native run progress and explicit continuation share the conversation's permission-scoped request owner. */
import { useState } from "react";
import { useAgentRunText } from "../../shared/i18n/agent-runs-i18n";
import { useBuildingText } from "../../shared/i18n/app-building-i18n";
import Icon from "../../shared/ui/Icon";
import type { SavedRun } from "./useChatTurns";
export default function AgentRunCard({
  value,
  control,
}: {
  value: SavedRun;
  control: (action: "resume" | "cancel") => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const act = async (action: "resume" | "cancel") => {
    setBusy(true);
    try {
      await control(action);
    } finally {
      setBusy(false);
    }
  };
  const text = useAgentRunText(),
    b = useBuildingText();
  const translationLink = (id: string) => {
    const target = new URL(location.href);
    target.searchParams.set("studio", "commerce");
    target.searchParams.set("settings", "languages");
    target.searchParams.set("translationJob", id);
    target.hash = "merchant";
    return target.href;
  };
  const preparingDrafts =
    (value.state === "queued" || value.state === "running") &&
    value.execution?.steps.some(
      (step) => step.translationJobId && !step.completed,
    );
  return (
    <aside className="agent-run-card" aria-live="polite">
      <div>
        <Icon name={value.state === "ready" ? "check" : "spark"} size={18} />
        <strong>
          {text(
            preparingDrafts
              ? "preparingDrafts"
              : value.execution && value.state === "ready"
                ? "workReady"
                : value.execution && value.state === "uncertain"
                  ? "workUncertain"
                  : value.state,
          )}
        </strong>
      </div>
      <p>{text(value.execution ? "workHint" : "hint")}</p>
      {value.execution && (
        <ol>
          {value.execution.steps.map((step, index) => (
            <li key={index}>
              <Icon name={step.completed ? "check" : "pulse"} size={14} />
              {step.label}
              {step.translationJobId && (
                <a href={translationLink(step.translationJobId)}>
                  {b("reviewTranslations")}
                </a>
              )}
            </li>
          ))}
        </ol>
      )}
      <small>
        {text(value.execution ? "workSteps" : "steps").replace(
          "{count}",
          String(value.execution?.completed ?? value.completedModelSteps ?? 0),
        )}
      </small>
      {value.error && (
        <p role="alert">
          {text(
            value.error.code === "agent_authority_changed"
              ? "authority"
              : value.error.code === "agent_capacity_busy"
                ? "capacity"
                : "failed",
          )}
        </p>
      )}
      {value.state === "uncertain" && (
        <p>{text(value.execution ? "workAmbiguous" : "ambiguous")}</p>
      )}
      <div className="agent-run-actions">
        {(value.state === "failed" || value.state === "uncertain") && (
          <button
            className="primary"
            disabled={busy}
            onClick={() => void act("resume")}
          >
            {text("resume")}
          </button>
        )}
        {value.state !== "ready" && value.state !== "cancelled" && (
          <button disabled={busy} onClick={() => void act("cancel")}>
            {text("cancel")}
          </button>
        )}
      </div>
    </aside>
  );
}

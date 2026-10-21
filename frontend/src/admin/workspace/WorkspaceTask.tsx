/** Personal goals open the native proposal review and apply owner; no second approval/execution path. */
import { useState } from "react";
import ProposalCard from "../assistant/ProposalCard";
import AgentRunCard from "../shell/AgentRunCard";
import type { Preview, RequestFn } from "../shell/studio-types";
import { useWorkspaceText } from "./workspace-i18n";
import { useTaskExecution } from "../shell/useTaskExecution";
import { prepareWorkFlow } from "../automation/goal-template";
import { copyWorkTemplate } from "../automation/work-template";
import { useWorkTemplateText } from "../automation/work-template-i18n";
export type WorkspaceTaskValue = {
  id: string;
  preview: Preview;
  applied: boolean;
  executionStarted?: boolean;
};
export default function WorkspaceTask({
  task,
  request,
  onTranslations,
  onFlow,
}: {
  task: WorkspaceTaskValue;
  request: RequestFn;
  onTranslations: (jobId: string) => void;
  onFlow?: () => void;
}) {
  const t = useWorkspaceText(),
    [open, setOpen] = useState(false),
    progress = useTaskExecution(
      task.id,
      task.applied,
      request,
      task.executionStarted,
    );
  const { busy, applied, error, accepted } = progress;
  const templateText = useWorkTemplateText();
  return (
    <article className="personal-task">
      <strong>{task.preview.proposal?.summary}</strong>
      {!progress.run && (
        <span>{t(applied ? "done" : accepted ? "working" : "review")}</span>
      )}
      <button onClick={() => setOpen(!open)}>{t("open")}</button>
      {onFlow && applied && copyWorkTemplate(task.id, task.preview) && (
        <button
          onClick={() => {
            if (prepareWorkFlow(task.id, task.preview)) onFlow();
          }}
        >
          {templateText("reuse")}
        </button>
      )}
      {progress.run && (
        <AgentRunCard
          value={progress.run}
          control={progress.control}
          onTranslations={onTranslations}
        />
      )}
      {error && (
        <div role="alert">
          {error}
          {accepted && <button onClick={progress.reload}>{t("reload")}</button>}
        </div>
      )}
      {open && (
        <div className="personal-task-review">
          <ProposalCard
            message={{
              id: 0,
              role: "assistant",
              content: task.preview.proposal.summary,
              applied,
              data: {
                taskId: task.id,
                preview: {
                  ...task.preview,
                  catalogBefore: task.preview.catalogBefore ?? [],
                },
              },
            }}
            busy={busy}
            approvalStarted={accepted}
            canApply={!applied && !accepted}
            onApply={progress.approve}
          />
          <details>
            <summary>{t("sources")}</summary>
            <pre>{JSON.stringify(task.preview, null, 2)}</pre>
          </details>
        </div>
      )}
    </article>
  );
}

/** Flow review observes the original native task, including approval made in another Studio view. */
import ProposalCard from "../assistant/ProposalCard";
import AgentRunCard from "../shell/AgentRunCard";
import { useTaskExecution } from "../shell/useTaskExecution";
import type { Preview, RequestFn } from "../shell/studio-types";
import { useWorkspaceText } from "../workspace/workspace-i18n";
export default function FlowProposalReview({
  taskId,
  preview,
  applied,
  executionStarted,
  request,
  manage,
  onTranslations,
}: {
  taskId: string;
  preview: Preview;
  applied: boolean;
  executionStarted: boolean;
  request: RequestFn;
  manage: boolean;
  onTranslations?: (jobId: string) => void;
}) {
  const progress = useTaskExecution(taskId, applied, request, executionStarted);
  const t = useWorkspaceText();
  return (
    <section>
      {progress.run && (
        <AgentRunCard
          value={progress.run}
          canControl={manage}
          control={async (action) => {
            if (manage) await progress.control(action);
          }}
          onTranslations={onTranslations}
        />
      )}
      {progress.error && (
        <p role="alert">
          {progress.error}
          {progress.accepted && (
            <button onClick={progress.reload}>{t("reload")}</button>
          )}
        </p>
      )}
      <ProposalCard
        message={{
          id: 0,
          role: "assistant",
          content: preview.proposal.summary,
          applied: progress.applied,
          data: {
            taskId,
            preview: { ...preview, catalogBefore: preview.catalogBefore ?? [] },
          },
        }}
        canApply={manage && !progress.applied && !progress.accepted}
        busy={progress.busy}
        approvalStarted={progress.accepted}
        onApply={() => {
          if (manage) void progress.approve();
        }}
      />
    </section>
  );
}

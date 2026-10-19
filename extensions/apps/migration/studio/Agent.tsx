/** A contextual drawer embeds the existing Studio agent; no second chat, inference runtime or approval store. */
import { useEffect, useRef } from "react";
import StudioConversation from "../../../../frontend/src/admin/shell/StudioConversation";
import { useMigrationText } from "./i18n";
import type { Kind, Review } from "./model";
import type { RunPlan } from "./run-model";
export default function Agent({
  onClose,
  kind,
  review,
  plan,
}: {
  onClose: () => void;
  kind: Kind;
  review?: Review;
  plan?: RunPlan;
}) {
  const dialog = useRef<HTMLDialogElement>(null),
    t = useMigrationText();
  useEffect(() => {
    dialog.current?.showModal();
    return () => dialog.current?.close();
  }, []);
  return (
    <dialog ref={dialog} className="migration-agent" onCancel={onClose}>
      <header>
        <h2>{t("agent")}</h2>
        <button type="button" onClick={onClose}>
          {t("close")}
        </button>
      </header>
      <p>{t("agentContext")}</p>
      <StudioConversation
        compact
        context={
          t("agentContext") +
          "\n" +
          JSON.stringify({
            domain: kind,
            workPlan: plan
              ? {
                  id: plan.id,
                  sourceId: plan.source_id,
                  target: plan.target,
                  domains: plan.domains,
                  importApproved: false,
                  cutoverReady: false,
                }
              : null,
            reviewedRecords: review?.records.length ?? 0,
            sourceVersion: review?.sourceVersion ?? null,
            privateProductPreview: true,
          })
        }
      />
    </dialog>
  );
}

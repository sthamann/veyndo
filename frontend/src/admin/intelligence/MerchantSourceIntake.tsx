/** Conversation intake reuses the real private versioned source editor and existing upload API. */
import { useEffect, useRef, useState } from "react";
import type { RequestFn } from "../shell/studio-types";
import type { Workspace } from "./knowledge-types";
import SourceEditor from "./SourceEditor";
import { useAgentWorkspaceText } from "../../shared/i18n/agent-workspace-i18n";
export default function MerchantSourceIntake({
  request,
  guidance,
  onClose,
}: {
  request: RequestFn;
  guidance: boolean;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null),
    t = useAgentWorkspaceText();
  const [workspace, setWorkspace] = useState<Workspace>(),
    [error, setError] = useState("");
  useEffect(() => {
    dialog.current?.showModal();
    let active = true;
    request("/api/knowledge/workspace")
      .then((v) => {
        if (active) setWorkspace(v);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [request]);
  return (
    <dialog
      ref={dialog}
      className="studio app-agent-drawer"
      onCancel={onClose}
      aria-label={t(guidance ? "guidance" : "source")}
    >
      <header>
        <h2>{t(guidance ? "guidance" : "source")}</h2>
        <button className="studio-secondary" onClick={onClose}>
          {t("close")}
        </button>
      </header>
      {guidance && <p>{t("guidanceHint")}</p>}
      {error && <p role="alert">{error}</p>}
      {workspace && (
        <SourceEditor
          workspace={workspace}
          request={request}
          initialKind={guidance ? "guidance" : "document"}
          onSaved={onClose}
          onCancel={onClose}
        />
      )}
    </dialog>
  );
}

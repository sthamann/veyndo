/** StudioComposer: focused Studio view; state and commands come from the session-scoped controller. */
import { lazy, Suspense, useState } from "react";
import { useCatalogIntakeText } from "../../shared/i18n/catalog-intake-i18n";
import type { IntakeMode } from "../catalog/catalog-intake-model";
import "../styles/catalog-intake.css";
const CatalogIntake = lazy(() => import("../catalog/CatalogIntake"));
import MerchantSourceIntake from "../intelligence/MerchantSourceIntake";
import { useAgentWorkspaceText } from "../../shared/i18n/agent-workspace-i18n";
import { locales } from "../../shared/i18n/i18n";
import "../../shared/styles/workbench.css";
import Icon from "../../shared/ui/Icon";
import "../styles/operations.css";
import "../styles/studio.css";

import { useStudio } from "./StudioContext";

export default function StudioComposer({ context }: { context?: string } = {}) {
  const c = useCatalogIntakeText(),
    aw = useAgentWorkspaceText();
  const [source, setSource] = useState<"document" | "guidance">();
  const [intake, setIntake] = useState<IntakeMode>();
  const {
    access,
    request,
    workspaceContext,
    tabLabel,
    workspace,
    environment,
    send,
    t,
    composer,
    draft,
    setDraft,
    connected,
    busy,
    locale,
  } = useStudio();
  return (
    <div className="composer-wrap">
      {workspaceContext && (
        <small>
          {aw("context")}:{" "}
          {tabLabel(workspaceContext.view as Parameters<typeof tabLabel>[0])}
          {workspaceContext.selected && ` · ${workspaceContext.selected.id}`}
        </small>
      )}
      {connected && access.includes("catalog.write") && (
        <div className="merchant-catalog-actions">
          {(
            [
              ["csv", "table"],
              ["url", "link"],
              ["demo", "spark"],
            ] as const
          ).map(([mode, icon]) => (
            <button
              type="button"
              key={mode}
              disabled={
                busy || (mode !== "csv" && !access.includes("assistant.use"))
              }
              onClick={() => setIntake(mode)}
            >
              <Icon name={icon} size={15} />
              {c(mode)}
            </button>
          ))}
        </div>
      )}
      {connected && access.includes("knowledge.write") && (
        <div className="merchant-catalog-actions">
          {(["document", "guidance"] as const).map((kind) => (
            <button
              key={kind}
              type="button"
              disabled={busy}
              onClick={() => setSource(kind)}
            >
              <Icon name={kind === "guidance" ? "spark" : "text"} size={15} />
              {aw(kind === "guidance" ? "guidance" : "source")}
            </button>
          ))}
        </div>
      )}
      {source && (
        <MerchantSourceIntake
          key={`${workspace}:${environment}:${locale}`}
          request={request}
          guidance={source === "guidance"}
          onClose={() => setSource(undefined)}
        />
      )}
      {intake && connected && access.includes("catalog.write") && (
        <Suspense fallback={null}>
          <CatalogIntake
            key={`${workspace}:${environment}:${locale}`}
            initialMode={intake}
            onClose={() => setIntake(undefined)}
          />
        </Suspense>
      )}
      <form
        className="studio-composer"
        onSubmit={(e) => {
          e.preventDefault();
          void send(context);
        }}
      >
        <label className="sr-only" htmlFor="studio-message">
          {t("message")}
        </label>
        <textarea
          maxLength={context ? Math.max(1, 4000 - context.length - 2) : 4000}
          id="studio-message"
          ref={composer}
          rows={2}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (
              e.key === "Enter" &&
              !e.shiftKey &&
              !e.nativeEvent.isComposing
            ) {
              e.preventDefault();
              void send(context);
            }
          }}
          placeholder={t("placeholder")}
        />
        <div>
          <span>
            <Icon name="lock" size={13} />
            {t("trust")}
          </span>
          <button
            type="submit"
            className="studio-primary"
            disabled={!connected || busy || !draft.trim()}
            aria-label={t("send")}
          >
            <Icon name="send" size={18} />
          </button>
        </div>
      </form>
      <small>
        {t("currentLocale")}: {locales[locale]} · {t("savedLanguage")}
      </small>
    </div>
  );
}

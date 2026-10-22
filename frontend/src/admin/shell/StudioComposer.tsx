/** StudioComposer: focused Studio view; state and commands come from the session-scoped controller. */
import { lazy, Suspense, useEffect, useState } from "react";
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
  const [intake, setIntake] = useState<{
    mode: IntakeMode;
    source: string;
    file?: File;
    scope: string;
  }>();
  const {
    access,
    token,
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
  const intakeScope = JSON.stringify([token, workspace, environment, locale]);
  const canImport =
    connected &&
    access.includes("catalog.read") &&
    access.includes("catalog.write");
  useEffect(() => {
    setIntake(undefined);
    setSource(undefined);
  }, [token, workspace, environment, locale]);
  const openIntake = (mode: IntakeMode, file?: File) =>
    setIntake({
      mode,
      file,
      scope: intakeScope,
      source:
        mode === "demo"
          ? draft
          : mode === "url" && /^https:\/\/\S+$/.test(draft.trim())
            ? draft.trim()
            : "",
    });
  return (
    <div
      className="composer-wrap"
      onDragOver={(e) => {
        if (canImport && !busy && e.dataTransfer.types.includes("Files"))
          e.preventDefault();
      }}
      onDrop={(e) => {
        if (!e.dataTransfer.files.length) return;
        e.preventDefault();
        if (canImport && !busy) openIntake("csv", e.dataTransfer.files[0]);
      }}
    >
      {workspaceContext && (
        <small>
          {aw("context")}:{" "}
          {tabLabel(workspaceContext.view as Parameters<typeof tabLabel>[0])}
          {workspaceContext.selected && ` · ${workspaceContext.selected.id}`}
        </small>
      )}
      {canImport && (
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
              onClick={() => openIntake(mode)}
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
      {intake && intake.scope === intakeScope && canImport && (
        <Suspense fallback={null}>
          <CatalogIntake
            key={`${workspace}:${environment}:${locale}`}
            initialMode={intake.mode}
            initialSource={intake.source}
            initialFile={intake.file}
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
          {canImport && (
            <label className="composer-file" title={c("dropCsv")}>
              <Icon name="plus" size={18} />
              <span>{c("csv")}</span>
              <input
                type="file"
                accept=".csv,text/csv"
                disabled={busy}
                aria-label={c("attachCsv")}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) openIntake("csv", file);
                  e.target.value = "";
                }}
              />
            </label>
          )}
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

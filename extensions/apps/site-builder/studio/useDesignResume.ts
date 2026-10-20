/** Non-sensitive editor intent survives native sandbox handoff; only a current authorized private preview can resume it. */
import { useEffect, useState, type RefObject } from "react";
import type { RequestFn } from "../../../../frontend/src/shared/api/types";
import { homeDraft } from "./home-draft";
import { designIntent, type DesignIntent } from "./DesignSetup";
import type { Designer } from "./useDesigner";
import type { DesignerMode } from "./DesignerInspector";
import type { HomeSnapshot } from "./StorefrontCanvas";
export default function useDesignResume({
  workspace,
  request,
  sandbox,
  writable,
  missing,
  d,
  language,
  mainLocale,
  nativeSnapshot,
  snapshotScope,
  scopeKey,
  setMode,
}: {
  workspace: string;
  request: RequestFn;
  sandbox: boolean;
  writable: boolean;
  missing?: string;
  d: Designer;
  language: string;
  mainLocale: string;
  nativeSnapshot: RefObject<HomeSnapshot | undefined>;
  snapshotScope: string;
  scopeKey: string;
  setMode: (mode: DesignerMode) => void;
}) {
  const [resume, setResume] = useState<{
    intent: DesignIntent;
    scope: string;
  }>();
  const beginSetup = (intent: DesignIntent) => {
    const url = new URL(location.href);
    url.searchParams.set("designIntent", intent);
    url.searchParams.set("designChannel", d.channel);
    if (sandbox) url.searchParams.set("designIntentTarget", workspace);
    else url.searchParams.delete("designIntentTarget");
    history.replaceState(null, "", url);
    setMode(
      intent === "agent" ? "agent" : intent === "blocks" ? "blocks" : "edit",
    );
    document.querySelector<HTMLElement>(".designer-start")?.focus();
  };
  useEffect(() => {
    if (!writable || missing || !d.loaded) return;
    const intent = designIntent();
    if (!intent) return;
    const url = new URL(location.href);
    const target = url.searchParams.get("designIntentTarget");
    url.searchParams.delete("designIntent");
    url.searchParams.delete("designIntentTarget");
    history.replaceState(null, "", url);
    if (target && target !== workspace) return;
    setMode(
      intent === "agent" ? "agent" : intent === "blocks" ? "blocks" : "edit",
    );
    setResume({ intent, scope: scopeKey });
  }, [workspace, request, writable, missing, d.loaded]);
  useEffect(() => {
    if (
      !writable ||
      !d.loaded ||
      !["hero", "products"].includes(resume?.intent ?? "")
    )
      return;
    if (resume?.scope !== scopeKey) {
      setResume(undefined);
      return;
    }
    if (!d.draft && snapshotScope !== scopeKey) return;
    const page =
      d.draft ??
      homeDraft(
        d.channel,
        mainLocale,
        language,
        d.context!.catalogue.elements,
        nativeSnapshot.current!,
      );
    if (!d.draft) d.open(page);
    d.setSelected(
      page.content.blocks.find((block) => block.kind === resume?.intent)?.id ??
        "",
    );
    setResume(undefined);
  }, [resume, d.loaded, writable, d.draft, snapshotScope, scopeKey]);
  return beginSetup;
}

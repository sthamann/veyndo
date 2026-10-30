/** Scope-fenced entry from native design, app and migration workspaces. */
import { useRef } from "react";
import { useStudio } from "../shell/StudioContext";
export function useScenarioNavigation() {
  const {
    request,
    environment,
    refreshEnvironments,
    setEnvironment,
    selectTab,
  } = useStudio();
  const current = useRef(request);
  current.current = request;
  return async (
    channel = "default",
    target?: string,
    sourceTaskId?: string,
    scenarioId?: string,
  ) => {
    const started = request;
    if (sourceTaskId) {
      const source = await request(
        `/api/agent/runs/${encodeURIComponent(sourceTaskId)}`,
      );
      if (current.current !== started) return;
      channel = source.channel ?? "default";
    }
    if (target && target !== environment) {
      await refreshEnvironments();
      if (current.current !== started) return;
      setEnvironment(target);
    }
    const url = new URL(location.href);
    url.searchParams.set("knowledgeSection", "scenarios");
    url.searchParams.set("scenarioChannel", channel);
    if (sourceTaskId) url.searchParams.set("scenarioSource", sourceTaskId);
    else url.searchParams.delete("scenarioSource");
    if (scenarioId) url.searchParams.set("scenarioId", scenarioId);
    else url.searchParams.delete("scenarioId");
    history.replaceState(null, "", url);
    selectTab("knowledge");
  };
}

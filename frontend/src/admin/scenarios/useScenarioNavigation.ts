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
  return async (channel = "default", target?: string) => {
    const started = request;
    if (target && target !== environment) {
      await refreshEnvironments();
      if (current.current !== started) return;
      setEnvironment(target);
    }
    const url = new URL(location.href);
    url.searchParams.set("knowledgeSection", "scenarios");
    url.searchParams.set("scenarioChannel", channel);
    history.replaceState(null, "", url);
    selectTab("knowledge");
  };
}

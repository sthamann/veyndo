/** Saved-test labels and reload links share the existing Studio URL without storing briefs or customer data. */
import type { Scenario } from "./scenario-types";
export function scenarioLabel(scenario: Scenario, locale: string): string {
  const date = scenario.updatedAt ? new Date(scenario.updatedAt) : undefined;
  const stamp =
    date && Number.isFinite(date.getTime()) ? date.toLocaleString(locale) : "";
  return [scenario.title, stamp, scenario.id.slice(0, 8)]
    .filter(Boolean)
    .join(" · ");
}
export function rememberScenario(id: string, channel: string) {
  const url = new URL(location.href);
  if (id) url.searchParams.set("scenarioId", id);
  else url.searchParams.delete("scenarioId");
  url.searchParams.set("scenarioChannel", channel);
  history.replaceState(history.state, "", url);
}

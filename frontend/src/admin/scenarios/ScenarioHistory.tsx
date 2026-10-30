/** Distinguishable saved-run and comparison selection for the customer lab. */
import { useLocale } from "../../shared/i18n/i18n";
import { useScenarioText } from "./scenario-i18n";
import { scenarioLabel } from "./scenario-history";
import type { Scenario } from "./scenario-types";
export default function ScenarioHistory({
  scenarios,
  selected,
  baseline,
  onSelect,
  onCompare,
}: {
  scenarios: Scenario[];
  selected: string;
  baseline: string;
  onSelect: (id: string) => void;
  onCompare: (id: string) => void;
}) {
  const t = useScenarioText(),
    { locale } = useLocale();
  return (
    <div className="scenario-history">
      <label>
        {t("history")}
        <select value={selected} onChange={(e) => onSelect(e.target.value)}>
          <option value="">{t("history")}</option>
          {scenarios.map((s) => (
            <option key={s.id} value={s.id}>
              {scenarioLabel(s, locale)}
            </option>
          ))}
        </select>
      </label>
      <label>
        {t("compare")}
        <select value={baseline} onChange={(e) => onCompare(e.target.value)}>
          <option value="">{t("none")}</option>
          {scenarios
            .filter((s) => s.id !== selected)
            .map((s) => (
              <option key={s.id} value={s.id}>
                {scenarioLabel(s, locale)}
              </option>
            ))}
        </select>
      </label>
    </div>
  );
}

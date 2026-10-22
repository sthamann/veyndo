/** Editable fictional customers share the channel's actual languages, countries and currency. */
import type { Dispatch, SetStateAction } from "react";
import Icon from "../../shared/ui/Icon";
import { useScenarioText } from "./scenario-i18n";
import type { Profile, Configuration } from "./scenario-types";
export default function ScenarioProfiles({
  profiles,
  config,
  onChange,
}: {
  profiles: Profile[];
  config: Configuration;
  onChange: Dispatch<SetStateAction<Profile[]>>;
}) {
  const t = useScenarioText();
  const edit = (index: number, patch: Partial<Profile>) =>
    onChange((ps) => ps.map((p, i) => (i === index ? { ...p, ...patch } : p)));
  return (
    <>
      <div className="scenario-section-title">
        <h3>{t("profiles")}</h3>
        <span>{config.currency}</span>
        <button
          className="studio-secondary"
          disabled={profiles.length >= 6}
          onClick={() =>
            onChange((ps) => [
              ...ps,
              {
                ...ps[0],
                id: crypto.randomUUID().slice(0, 20),
                name: `${t("profile")} ${ps.length + 1}`,
              },
            ])
          }
        >
          {t("addProfile")}
        </button>
      </div>
      <div className="scenario-profiles">
        {profiles.map((p, index) => (
          <article key={p.id}>
            <button
              className="scenario-remove"
              aria-label={`${t("removeProfile")} · ${p.name}`}
              disabled={profiles.length <= 1}
              onClick={() => onChange((ps) => ps.filter((_, i) => i !== index))}
            >
              <Icon name="close" />
            </button>
            <label>
              {t("profile")}
              <input
                value={p.name}
                maxLength={80}
                onChange={(e) => edit(index, { name: e.target.value })}
              />
            </label>
            <textarea
              aria-label={`${t("goal")} · ${p.name}`}
              value={p.goal}
              maxLength={800}
              rows={3}
              onChange={(e) => edit(index, { goal: e.target.value })}
            />
            <label>
              {t("budget")} · {config.currency}
              <input
                type="number"
                min={1 / 10 ** config.scale}
                step={1 / 10 ** config.scale}
                value={p.budgetMinor / 10 ** config.scale}
                onChange={(e) =>
                  edit(index, {
                    budgetMinor: Math.round(
                      Number(e.target.value) * 10 ** config.scale,
                    ),
                  })
                }
              />
            </label>
            <div className="scenario-profile-context">
              <label>
                {t("language")}
                <select
                  value={p.locale}
                  onChange={(e) => edit(index, { locale: e.target.value })}
                >
                  {config.locales.map((l) => (
                    <option key={l}>{l}</option>
                  ))}
                </select>
              </label>
              <label>
                {t("country")}
                <select
                  value={p.country}
                  onChange={(e) => edit(index, { country: e.target.value })}
                >
                  {config.countries.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </label>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}

/** Catalogue-derived drafts are previewed before adoption; native commerce still decides actual prices and purchases. */
import { useState } from "react";
import { useLocale } from "../../shared/i18n/i18n";
import Icon from "../../shared/ui/Icon";
import { useScenarioText } from "./scenario-i18n";
import type { Configuration, Profile } from "./scenario-types";
export default function ScenarioSuggestions({
  config,
  onApply,
  disabled,
}: {
  config: Configuration;
  onApply: (profiles: Profile[]) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const t = useScenarioText(),
    { locale } = useLocale();
  const products = (config.catalogue ?? [])
    .filter(
      (p) =>
        p.name.trim() &&
        Number.isSafeInteger(p.priceMinor) &&
        p.priceMinor > 0 &&
        p.priceMinor <= 100_000_000,
    )
    .slice(0, 12)
    .sort((a, b) => a.priceMinor - b.priceMinor);
  const kinds = ["budget", "first", "fast"] as const;
  const picks = [products[0], products[0], products.at(-1)];
  const mainLocale = config.locales.includes(config.mainLocale)
    ? config.mainLocale
    : config.locales[0];
  const profiles: Profile[] =
    products.length && config.countries.length && config.locales.length
      ? kinds.map((kind, index) => ({
          id: kind,
          name: t(`${kind}Name`),
          goal: t(
            index === 0
              ? "suggestBudget"
              : index === 1
                ? "suggestFirst"
                : "suggestFast",
          ).replace("{product}", JSON.stringify(picks[index]!.name)),
          budgetMinor:
            index === 0
              ? Math.max(1, picks[index]!.priceMinor - 1)
              : Math.min(
                  100_000_000,
                  Math.ceil((picks[index]!.priceMinor * 6) / 5),
                ),
          locale:
            index === 1
              ? (config.locales.find((l) => l !== mainLocale) ?? mainLocale)
              : mainLocale,
          country:
            index === 2
              ? (config.countries[1] ?? config.countries[0])
              : config.countries[0],
        }))
      : [];
  return (
    <section className="scenario-suggestions">
      <button
        className="studio-secondary"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen(!open)}
      >
        <Icon name="people" />
        {t("suggest")}
      </button>
      {open && (
        <div className="scenario-suggestion-preview">
          <p>
            {t(profiles.length ? "suggestIntro" : "suggestEmpty").replace(
              "{count}",
              String(products.length),
            )}
          </p>
          {!!profiles.length && (
            <>
              <div className="scenario-profiles">
                {profiles.map((profile, index) => (
                  <article key={profile.id}>
                    <strong>{profile.name}</strong>
                    <span>{picks[index]!.name}</span>
                    <p>{profile.goal}</p>
                    <span>
                      {t("budget")} ·{" "}
                      {new Intl.NumberFormat(locale, {
                        style: "currency",
                        currency: config.currency,
                      }).format(profile.budgetMinor / 10 ** config.scale)}
                    </span>
                  </article>
                ))}
              </div>
              <button
                className="studio-secondary"
                disabled={disabled}
                onClick={() => {
                  onApply(profiles);
                  setOpen(false);
                }}
              >
                {t("suggestApply")}
              </button>
            </>
          )}
        </div>
      )}
    </section>
  );
}

/** Explicit source language IDs map to real content locales without relabelling or fabricating translations. */
import { useMigrationText } from "./i18n";
export default function LanguageMap({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const t = useMigrationText();
  let entries: [string, string][] = [];
  try {
    entries = Object.entries(JSON.parse(value));
  } catch {
    entries = [];
  }
  const update = (i: number, key: string, locale: string) => {
    const next = [...entries];
    next[i] = [key, locale];
    if (new Set(next.map(([id]) => id)).size === next.length)
      onChange(JSON.stringify(Object.fromEntries(next)));
  };
  return (
    <fieldset>
      <legend>{t("language_map")}</legend>
      {entries.map(([id, locale], i) => (
        <div className="migration-fields" key={i}>
          <label>
            {t("languageId")}
            <input
              required
              value={id}
              maxLength={20}
              onChange={(e) => update(i, e.target.value, locale)}
            />
          </label>
          <label>
            {t("locale")}
            <input
              required
              value={locale}
              maxLength={35}
              onChange={(e) => update(i, id, e.target.value)}
            />
          </label>
        </div>
      ))}
      <button
        type="button"
        onClick={() => {
          let id = 1;
          while (entries.some(([key]) => key === String(id))) id++;
          onChange(
            JSON.stringify({ ...Object.fromEntries(entries), [id]: "" }),
          );
        }}
      >
        {t("addLanguage")}
      </button>
    </fieldset>
  );
}

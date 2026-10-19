/** Operator profile selection is context only and never a browser-held credential. */
import { useMigrationText } from "./i18n";
export default function SourceProfile({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const t = useMigrationText();
  return (
    <details>
      <summary>{t("sourceId")}</summary>
      <input
        aria-label={t("sourceId")}
        value={value}
        maxLength={100}
        onChange={(e) => onChange(e.target.value)}
      />
    </details>
  );
}

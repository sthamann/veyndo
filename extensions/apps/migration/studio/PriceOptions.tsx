/** One reviewed tax rate and explicit original basis feed the existing native price owner. */
import { usePriceText } from "./price-i18n";
export default function PriceOptions({
  value,
  onChange,
  locked,
}: {
  value: string;
  locked?: boolean;
  onChange: (value: string) => void;
}) {
  const t = usePriceText();
  return (
    <label>
      {t("basis")}
      <select
        disabled={locked}
        aria-label={t("basis")}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">{t("choose")}</option>
        <option value="gross">{t("gross")}</option>
        <option value="net">{t("net")}</option>
      </select>
      <small>{t("hint")}</small>
    </label>
  );
}

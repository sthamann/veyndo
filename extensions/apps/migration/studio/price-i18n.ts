/** Source tax-basis choices are explicit; conversion belongs to the existing native tax calculator. */
import { useLocale } from "../../../../frontend/src/shared/i18n/i18n";
const words = {
  basis: [
    "Source price basis",
    "Preisbasis der Quelle",
    "Base des prix d’origine",
    "Base de precios original",
  ],
  choose: [
    "Choose the original tax basis",
    "Ursprüngliche Steuerbasis wählen",
    "Choisir la base fiscale d’origine",
    "Elegir la base fiscal original",
  ],
  gross: [
    "Includes tax (gross)",
    "Inklusive Steuer (brutto)",
    "Taxes incluses (TTC)",
    "Impuestos incluidos (bruto)",
  ],
  net: [
    "Excludes tax (net)",
    "Ohne Steuer (netto)",
    "Hors taxes (HT)",
    "Sin impuestos (neto)",
  ],
  hint: [
    "Net source prices are converted by Veyndo’s tax calculator using the reviewed destination rate. Original amounts remain recorded.",
    "Nettopreise werden mit dem geprüften Zielsteuersatz durch Veyndos Steuerrechner umgerechnet. Die Originalbeträge bleiben gespeichert.",
    "Le calculateur fiscal Veyndo convertit les prix HT au taux cible vérifié. Les montants d’origine sont conservés.",
    "El cálculo fiscal de Veyndo convierte los precios netos con el tipo revisado. Los importes originales se conservan.",
  ],
  taxWarning: [
    "Review the original tax basis and destination tax rate before import.",
    "Prüfe ursprüngliche Preisbasis und Zielsteuersatz vor der Übernahme.",
    "Vérifiez la base fiscale d’origine et le taux cible avant import.",
    "Revisa la base fiscal original y el tipo de destino antes de importar.",
  ],
} as const;
export function usePriceText() {
  const { locale } = useLocale();
  const i = locale.startsWith("de")
    ? 1
    : locale.startsWith("fr")
      ? 2
      : locale.startsWith("es")
        ? 3
        : 0;
  return (key: keyof typeof words) => words[key][i];
}

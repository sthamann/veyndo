/** Original product evidence distinguishes private variants and source inventory from active target stock. */
import { useLocale } from "../../../../frontend/src/shared/i18n/i18n";
const words = {
  family: [
    "Variant family",
    "Variantenfamilie",
    "Famille de variantes",
    "Familia de variantes",
  ],
  parent: [
    "Original parent",
    "Ursprüngliches Hauptprodukt",
    "Parent d’origine",
    "Producto principal original",
  ],
  sku: [
    "Source SKU",
    "Quellartikelnummer",
    "Référence d’origine",
    "Referencia original",
  ],
  stock: [
    "Source stock",
    "Quellbestand",
    "Stock d’origine",
    "Existencias originales",
  ],
  visible: [
    "Published at source",
    "In der Quelle veröffentlicht",
    "Publié à l’origine",
    "Publicado en origen",
  ],
  hidden: [
    "Hidden at source",
    "In der Quelle verborgen",
    "Masqué à l’origine",
    "Oculto en origen",
  ],
  unknown: [
    "Source visibility not provided",
    "Quellsichtbarkeit nicht angegeben",
    "Visibilité d’origine non fournie",
    "Visibilidad original no indicada",
  ],
  target: [
    "Target stock starts at zero; activation is a separate step.",
    "Zielbestand startet bei null; die Aktivierung ist ein eigener Schritt.",
    "Le stock cible démarre à zéro ; son activation est distincte.",
    "Las existencias de destino empiezan en cero; la activación es independiente.",
  ],
} as const;
export function useProductText() {
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

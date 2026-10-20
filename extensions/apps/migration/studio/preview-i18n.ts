/** Merchant-facing labels for transient source/current-target catalogue review. */
import { useLocale } from "../../../../frontend/src/shared/i18n/i18n";
const words = {
  title: [
    "Compare a product",
    "Produkt vergleichen",
    "Comparer un produit",
    "Comparar un producto",
  ],
  hint: [
    "Read the selected private target now. This never imports or publishes.",
    "Lies jetzt den gewählten privaten Zielstand. Dabei wird nichts importiert oder veröffentlicht.",
    "Lire la cible privée sélectionnée, sans importer ni publier.",
    "Lee el destino privado seleccionado, sin importar ni publicar.",
  ],
  choose: [
    "Product to compare",
    "Produkt zum Vergleichen",
    "Produit à comparer",
    "Producto para comparar",
  ],
  load: [
    "Read current target",
    "Aktuellen Zielstand lesen",
    "Lire la cible actuelle",
    "Leer destino actual",
  ],
  busy: [
    "Reading target…",
    "Zielstand wird gelesen…",
    "Lecture de la cible…",
    "Leyendo destino…",
  ],
  prerequisite: [
    "Choose an existing private workspace, source price basis and tax rate first. Catalogue read access is required.",
    "Wähle zuerst eine vorhandene private Arbeitsumgebung, die Preisbasis und den Steuersatz. Dafür brauchst du Leserechte für Produkte.",
    "Choisissez un espace privé existant, la base des prix et le taux. L’accès au catalogue est requis.",
    "Elige un espacio privado existente, la base y el impuesto. Se requiere acceso al catálogo.",
  ],
  source: [
    "Original source",
    "Originalquelle",
    "Source originale",
    "Origen original",
  ],
  target: [
    "Current Veyndo product",
    "Aktuelles Veyndo-Produkt",
    "Produit Veyndo actuel",
    "Producto actual en Veyndo",
  ],
  mapped: [
    "Expected after native mapping",
    "Nach nativer Zuordnung erwartet",
    "Attendu après conversion native",
    "Esperado tras conversión nativa",
  ],
  field: ["Field", "Feld", "Champ", "Campo"],
  differences: ["Differences", "Abweichungen", "Différences", "Diferencias"],
  matching: [
    "Mapped fields match at this moment",
    "Zugeordnete Felder stimmen aktuell überein",
    "Les champs correspondent actuellement",
    "Los campos coinciden ahora",
  ],
  changed: [
    "Target has changed",
    "Ziel wurde verändert",
    "La cible a changé",
    "El destino ha cambiado",
  ],
  missing: [
    "Not yet in this target",
    "Noch nicht in diesem Ziel vorhanden",
    "Absent de cette cible",
    "Aún no existe en este destino",
  ],
  checked: ["Read at", "Gelesen am", "Lu le", "Leído el"],
  name: ["Name", "Name", "Nom", "Nombre"],
  description: ["Description", "Beschreibung", "Description", "Descripción"],
  sku: ["Product number", "Produktnummer", "Référence", "Referencia"],
  price: ["Price", "Preis", "Prix", "Precio"],
  taxRate: [
    "Destination tax rate",
    "Zielsteuersatz",
    "Taux cible",
    "Impuesto de destino",
  ],
  active: [
    "Catalogue visibility",
    "Katalogsichtbarkeit",
    "Visibilité catalogue",
    "Visibilidad del catálogo",
  ],
  parentId: [
    "Variant parent",
    "Varianten-Hauptprodukt",
    "Produit parent",
    "Producto principal",
  ],
  options: [
    "Variant options",
    "Variantenausprägungen",
    "Options de variante",
    "Opciones de variante",
  ],
  media: ["Images", "Bilder", "Images", "Imágenes"],
  yes: [
    "Visible in catalogue",
    "Im Katalog sichtbar",
    "Visible au catalogue",
    "Visible en catálogo",
  ],
  no: [
    "Hidden in catalogue",
    "Im Katalog verborgen",
    "Masqué au catalogue",
    "Oculto en catálogo",
  ],
  none: ["Not supplied", "Nicht angegeben", "Non fourni", "No indicado"],
  notice: [
    "This is a private product, not a publication check. Stock activation and image imports have separate review steps. Preview: up to 16 languages, 4,000 characters per text and 8 target images. Refresh after any edits.",
    "Dies ist ein privates Produkt, keine Veröffentlichungsprüfung. Bestandsaktivierung und Bildimporte werden separat geprüft. Vorschau: bis zu 16 Sprachen, 4.000 Zeichen je Text und 8 Zielbilder. Nach Änderungen erneut lesen.",
    "Produit privé, sans preuve de publication. Stock et images ont leurs propres vérifications. Aperçu : 16 langues, 4 000 caractères par texte et 8 images cible. Relire après modification.",
    "Producto privado, sin comprobación de publicación. Stock e imágenes se revisan por separado. Vista: 16 idiomas, 4.000 caracteres por texto y 8 imágenes destino. Actualiza tras cambios.",
  ],
  sourceImages: [
    "Images are reviewed separately under Images",
    "Bilder werden separat unter Bilder geprüft",
    "Images vérifiées séparément dans Images",
    "Las imágenes se revisan por separado en Imágenes",
  ],
  raw: [
    "Technical comparison paths",
    "Technische Vergleichspfade",
    "Chemins techniques",
    "Rutas técnicas",
  ],
} as const;
export function usePreviewText() {
  const { locale } = useLocale();
  const index = locale.startsWith("de")
    ? 1
    : locale.startsWith("fr")
      ? 2
      : locale.startsWith("es")
        ? 3
        : 0;
  return (key: keyof typeof words) => words[key][index];
}

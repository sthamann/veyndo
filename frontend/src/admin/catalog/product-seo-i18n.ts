/** Product search-preview labels and automatic SEO guidance in all Studio interface languages. */
import { useLocale } from "../../shared/i18n/i18n";
const words = {
  preview: [
    "Search preview",
    "Suchvorschau",
    "Aperçu de recherche",
    "Vista previa de búsqueda",
  ],
  previewHint: [
    "Review the title, address and description in the selected content language.",
    "Prüfe Titel, Adresse und Beschreibung in der gewählten Inhaltssprache.",
    "Vérifiez le titre, l’adresse et la description dans la langue sélectionnée.",
    "Revisa el título, la dirección y la descripción en el idioma seleccionado.",
  ],
  automatic: ["Automatic", "Automatisch", "Automatique", "Automático"],
  inheritedHint: [
    "Automatic fields use the main-language SEO value, then the product text. Editing creates your own value; the language button restores automatic values.",
    "Automatische Felder nutzen den SEO-Wert der Hauptsprache, danach den Produkttext. Beim Bearbeiten entsteht ein eigener Wert. Über die Sprachschaltfläche stellst du die Automatik wieder her.",
    "Les champs automatiques utilisent la valeur SEO de la langue principale, puis le texte du produit. La saisie crée votre propre valeur ; le bouton de langue rétablit les valeurs automatiques.",
    "Los campos automáticos usan el valor SEO del idioma principal y después el texto del producto. Al editar creas tu propio valor; el botón de idioma restaura los valores automáticos.",
  ],
  slug: [
    "Readable URL ending",
    "Lesbarer URL-Teil",
    "Fin d’URL lisible",
    "Final de URL legible",
  ],
  slugHint: [
    "The product link stays reachable when you change this readable ending.",
    "Der Produktlink bleibt auch nach einer Änderung dieses lesbaren URL-Teils erreichbar.",
    "Le lien du produit reste accessible lorsque vous modifiez cette fin lisible.",
    "El enlace del producto sigue siendo accesible al cambiar este final legible.",
  ],
  characters: [
    "{count} characters",
    "{count} Zeichen",
    "{count} caractères",
    "{count} caracteres",
  ],
  tooLong: [
    "This text exceeds the field limit. Shorten it before saving.",
    "Dieser Text ist für das Feld zu lang. Kürze ihn vor dem Speichern.",
    "Ce texte dépasse la limite du champ. Raccourcissez-le avant l’enregistrement.",
    "Este texto supera el límite del campo. Acórtalo antes de guardar.",
  ],
  invalidSlug: [
    "Use a single URL ending without /, ? or #.",
    "Verwende einen einzelnen URL-Teil ohne /, ? oder #.",
    "Utilisez une seule fin d’URL sans /, ? ni #.",
    "Usa un único final de URL sin /, ? ni #.",
  ],
  invalid: [
    "Check the SEO fields. A value is too long or the URL ending contains /, ? or #. Other content languages may also need checking.",
    "Prüfe die SEO-Felder. Ein Wert ist zu lang oder der URL-Teil enthält /, ? oder #. Prüfe gegebenenfalls auch die anderen Inhaltssprachen.",
    "Vérifiez les champs SEO. Une valeur est trop longue ou la fin d’URL contient /, ? ou #. Vérifiez aussi les autres langues du contenu si nécessaire.",
    "Revisa los campos SEO. Un valor es demasiado largo o el final de URL contiene /, ? o #. Revisa también los otros idiomas si es necesario.",
  ],
  noTitle: [
    "No title set",
    "Kein Titel gesetzt",
    "Aucun titre défini",
    "Sin título",
  ],
  noDescription: [
    "No description set",
    "Keine Beschreibung gesetzt",
    "Aucune description définie",
    "Sin descripción",
  ],
  saveFirst: [
    "Save the product to obtain its address.",
    "Speichere das Produkt, um seine Adresse zu erhalten.",
    "Enregistrez le produit pour obtenir son adresse.",
    "Guarda el producto para obtener su dirección.",
  ],
} as const;
export function useProductSeoText() {
  const { locale } = useLocale();
  return (
    key: keyof typeof words,
    values: Record<string, string | number> = {},
  ) =>
    Object.entries(values).reduce(
      (text, [key, value]) => text.replaceAll(`{${key}}`, String(value)),
      words[key][
        { "en-GB": 0, "de-DE": 1, "fr-FR": 2, "es-ES": 3 }[locale]
      ] as string,
    );
}

/** Product content guidance and optional identity grouping use the shared four-language interface contract. */
import { useLocale } from "../../shared/i18n/i18n";
const words = {
  shortHint: [
    "A brief introduction shown separately from the full description.",
    "Eine kurze Einführung, die getrennt von der ausführlichen Beschreibung erscheint.",
    "Une brève introduction affichée séparément de la description complète.",
    "Una breve introducción que se muestra separada de la descripción completa.",
  ],
  richHint: [
    "Format the full product description with text, lists and media. Preview uses the shop’s content renderer.",
    "Gestalte die ausführliche Produktbeschreibung mit Text, Listen und Medien. Die Vorschau nutzt die Inhaltsdarstellung des Shops.",
    "Mettez en forme la description complète avec du texte, des listes et des médias. L’aperçu utilise le rendu du contenu de la boutique.",
    "Da formato a la descripción completa con texto, listas y medios. La vista previa utiliza el mismo renderizador de contenido que la tienda.",
  ],
  inheritedHint: [
    "You are seeing the main-language description. Edit it to create your own translation, or use the language button to return to inheritance.",
    "Du siehst die Beschreibung der Hauptsprache. Bearbeite sie für eine eigene Übersetzung. Über die Sprachschaltfläche kannst du die Vererbung wiederherstellen.",
    "Vous voyez la description dans la langue principale. Modifiez-la pour créer votre traduction, ou utilisez le bouton de langue pour rétablir l’héritage.",
    "Estás viendo la descripción del idioma principal. Edítala para crear tu traducción o usa el botón de idioma para restaurar la herencia.",
  ],
  shortSource: [
    "From the short description",
    "Aus der Kurzbeschreibung",
    "Depuis la description courte",
    "Desde la descripción breve",
  ],
  shortSourceHint: [
    "No separate full description exists yet. You can use the short description as a starting point and edit it here.",
    "Es gibt noch keine eigene ausführliche Beschreibung. Du kannst die Kurzbeschreibung als Ausgangspunkt nehmen und hier weiterbearbeiten.",
    "Il n’existe pas encore de description complète distincte. Vous pouvez utiliser la description courte comme point de départ et la modifier ici.",
    "Aún no existe una descripción completa independiente. Puedes usar la descripción breve como punto de partida y editarla aquí.",
  ],
  details: [
    "Product identifiers & shipping flags",
    "Produktkennzeichen & Versandeigenschaften",
    "Identifiants produit et propriétés de livraison",
    "Identificadores y propiedades de envío",
  ],
  detailsHint: [
    "Manufacturer, GTIN and optional product flags.",
    "Hersteller, GTIN und optionale Produkteigenschaften.",
    "Fabricant, GTIN et propriétés produit facultatives.",
    "Fabricante, GTIN y propiedades opcionales del producto.",
  ],
} as const;
export function useProductContentText() {
  const { locale } = useLocale();
  const index = { "en-GB": 0, "de-DE": 1, "fr-FR": 2, "es-ES": 3 }[locale];
  return (key: keyof typeof words) => words[key][index];
}

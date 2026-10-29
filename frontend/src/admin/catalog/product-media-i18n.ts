/** Gallery ordering guidance shares interface locales without changing product image translations. */
import { useLocale } from "../../shared/i18n/i18n";
const words = {
  count: [
    "{count} of 20 images",
    "{count} von 20 Bildern",
    "{count} images sur 20",
    "{count} de 20 imágenes",
  ],
  coverHint: [
    "The first image is the cover.",
    "Das erste Bild ist das Titelbild.",
    "La première image est l’image principale.",
    "La primera imagen es la principal.",
  ],
  order: [
    "The first image is the cover. Drag images to reorder, or select one and use Previous / Next.",
    "Das erste Bild ist das Titelbild. Ziehe Bilder an die gewünschte Position oder wähle ein Bild und nutze Nach vorne / Nach hinten.",
    "La première image est l’image principale. Faites glisser les images ou sélectionnez-en une et utilisez Précédente / Suivante.",
    "La primera imagen es la principal. Arrastra las imágenes o selecciona una y usa Anterior / Siguiente.",
  ],
  image: [
    "Image {position}",
    "Bild {position}",
    "Image {position}",
    "Imagen {position}",
  ],
  drop: [
    "Drop at position {position}",
    "An Position {position} ablegen",
    "Déposer en position {position}",
    "Soltar en la posición {position}",
  ],
  moved: [
    "Image moved to position {position}. Save the product to keep this order.",
    "Bild an Position {position} verschoben. Speichere das Produkt, um diese Reihenfolge zu übernehmen.",
    "Image déplacée en position {position}. Enregistrez le produit pour conserver cet ordre.",
    "Imagen movida a la posición {position}. Guarda el producto para conservar este orden.",
  ],
} as const;
export function useProductMediaText() {
  const { locale } = useLocale();
  return (key: keyof typeof words, value: string | number = "") =>
    words[key][{ "en-GB": 0, "de-DE": 1, "fr-FR": 2, "es-ES": 3 }[locale]]
      .replace("{count}", String(value))
      .replaceAll("{position}", String(value));
}

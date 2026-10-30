/** Page overview controls use the same interface locales as the surrounding editor. */
import { useLocale } from "../../../../frontend/src/shared/i18n/i18n";
const words = {
  overview: [
    "Page overview",
    "Seitenübersicht",
    "Vue des pages",
    "Vista de páginas",
  ],
  edit: ["Edit page", "Seite bearbeiten", "Modifier la page", "Editar página"],
  home: ["Home", "Startseite", "Accueil", "Inicio"],
  hint: [
    "Compare your home and content pages. Open a preview to continue editing.",
    "Vergleiche Startseite und Inhaltsseiten. Öffne eine Vorschau zum Bearbeiten.",
    "Comparez l’accueil et les pages de contenu. Ouvrez un aperçu pour modifier.",
    "Compara el inicio y las páginas de contenido. Abre una vista previa para editar.",
  ],
  shared: [
    "Uses the home page design",
    "Übernimmt die Gestaltung der Startseite",
    "Reprend le style de l’accueil",
    "Usa el diseño del inicio",
  ],
  own: [
    "Contains page-specific design",
    "Enthält eigene Gestaltung",
    "Contient un style propre",
    "Contiene diseño propio",
  ],
  base: [
    "Design inherited by other pages",
    "Gestaltung für die anderen Seiten",
    "Style hérité par les autres pages",
    "Diseño heredado por las otras páginas",
  ],
  native: [
    "Standard storefront",
    "Standard-Shop",
    "Boutique standard",
    "Tienda estándar",
  ],
  draft: [
    "Unsaved changes",
    "Ungespeicherte Änderungen",
    "Modifications non enregistrées",
    "Cambios sin guardar",
  ],
  previous: [
    "Previous pages",
    "Vorherige Seiten",
    "Pages précédentes",
    "Páginas anteriores",
  ],
  next: [
    "Next pages",
    "Weitere Seiten",
    "Pages suivantes",
    "Páginas siguientes",
  ],
  more: [
    "Load more saved pages",
    "Weitere gespeicherte Seiten laden",
    "Charger d’autres pages enregistrées",
    "Cargar más páginas guardadas",
  ],
  failed: [
    "Some selected products could not be loaded. Open the page and try again.",
    "Einige ausgewählte Produkte konnten nicht geladen werden. Öffne die Seite und versuche es erneut.",
    "Certains produits n’ont pas pu être chargés. Ouvrez la page et réessayez.",
    "No se pudieron cargar algunos productos. Abre la página e inténtalo de nuevo.",
  ],
} as const;
export function useOverviewText() {
  const { locale } = useLocale();
  const index =
    locale === "de-DE"
      ? 1
      : locale === "fr-FR"
        ? 2
        : locale === "es-ES"
          ? 3
          : 0;
  return (key: keyof typeof words) => words[key][index];
}

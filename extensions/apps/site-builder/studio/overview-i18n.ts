/** Page overview controls use the same interface locales as the surrounding editor. */
import { useLocale } from "../../../../frontend/src/shared/i18n/i18n";
const words = {
  product: [
    "Product detail",
    "Produktdetail",
    "Fiche produit",
    "Ficha de producto",
  ],
  chooseProduct: [
    "Preview product",
    "Produkt für die Vorschau",
    "Produit de l’aperçu",
    "Producto de la vista previa",
  ],
  productHint: [
    "Native gallery, prices and variants with the home design. Purchasing and app actions are inactive.",
    "Originale Galerie, Preise und Varianten mit der Gestaltung der Startseite. Kauf und App-Aktionen sind inaktiv.",
    "Galerie, prix et variantes natifs avec le style de l’accueil. Achats et actions des apps inactifs.",
    "Galería, precios y variantes nativos con el diseño del inicio. Compras y acciones de apps inactivas.",
  ],
  retry: ["Try again", "Erneut versuchen", "Réessayer", "Reintentar"],
  productUnavailable: [
    "No product price is available for this preview.",
    "Für diese Vorschau ist kein Produktpreis verfügbar.",
    "Aucun prix n’est disponible pour cet aperçu.",
    "No hay precio disponible para esta vista previa.",
  ],
  overview: [
    "Page overview",
    "Seitenübersicht",
    "Vue des pages",
    "Vista de páginas",
  ],
  edit: ["Edit page", "Seite bearbeiten", "Modifier la page", "Editar página"],
  home: ["Home", "Startseite", "Accueil", "Inicio"],
  hint: [
    "Compare home, content pages and a product. Open a content page to continue editing.",
    "Vergleiche Startseite, Inhaltsseiten und ein Produkt. Öffne eine Inhaltsseite zum Bearbeiten.",
    "Comparez l’accueil, les pages de contenu et un produit. Ouvrez une page de contenu pour la modifier.",
    "Compara el inicio, las páginas de contenido y un producto. Abre una página de contenido para editarla.",
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

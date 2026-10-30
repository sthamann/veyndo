/** Product category/channel assignment guidance in every supported Studio interface language. */
import { useLocale } from "../../shared/i18n/i18n";
const words = {
  categorySearch: [
    "Search categories or paths",
    "Kategorien oder Pfade suchen",
    "Rechercher des catégories ou chemins",
    "Buscar categorías o rutas",
  ],
  channelSearch: [
    "Search sales channels",
    "Verkaufskanäle suchen",
    "Rechercher des canaux de vente",
    "Buscar canales de venta",
  ],
  channels: [
    "Sales channels",
    "Verkaufskanäle",
    "Canaux de vente",
    "Canales de venta",
  ],
  selected: [
    "{count} selected",
    "{count} ausgewählt",
    "{count} sélectionnés",
    "{count} seleccionados",
  ],
  onlySelected: [
    "Show selected categories only",
    "Nur ausgewählte Kategorien zeigen",
    "Afficher uniquement les catégories sélectionnées",
    "Mostrar solo categorías seleccionadas",
  ],
  remove: [
    "Remove {name}",
    "{name} entfernen",
    "Retirer {name}",
    "Quitar {name}",
  ],
  noCategories: [
    "No categories are available. Create them in Products → Categories.",
    "Noch keine Kategorien vorhanden. Lege sie unter Produkte → Kategorien an.",
    "Aucune catégorie disponible. Créez-les dans Produits → Catégories.",
    "No hay categorías disponibles. Créalas en Productos → Categorías.",
  ],
  noMatches: [
    "No matches. Change the search or turn off the selection filter.",
    "Keine Treffer. Ändere die Suche oder schalte den Auswahlfilter aus.",
    "Aucun résultat. Modifiez la recherche ou désactivez le filtre de sélection.",
    "Sin resultados. Cambia la búsqueda o desactiva el filtro de selección.",
  ],
  noSelection: [
    "No categories selected yet.",
    "Noch keine Kategorien ausgewählt.",
    "Aucune catégorie sélectionnée.",
    "Todavía no hay categorías seleccionadas.",
  ],
  more: [
    "Show more categories",
    "Weitere Kategorien anzeigen",
    "Afficher plus de catégories",
    "Mostrar más categorías",
  ],
  results: [
    "{count} of {total} categories shown",
    "{count} von {total} Kategorien angezeigt",
    "{count} catégories affichées sur {total}",
    "{count} de {total} categorías mostradas",
  ],
  noChannels: [
    "No sales channels are available in this product context.",
    "In diesem Produktkontext sind keine Verkaufskanäle verfügbar.",
    "Aucun canal de vente disponible dans ce contexte produit.",
    "No hay canales de venta disponibles en este contexto de producto.",
  ],
  saveFirst: [
    "Save the product first to choose its sales channels.",
    "Speichere das Produkt zuerst, um seine Verkaufskanäle auszuwählen.",
    "Enregistrez d’abord le produit pour choisir ses canaux de vente.",
    "Guarda primero el producto para elegir sus canales de venta.",
  ],
  noneVisible: [
    "This product is not selected for any sales channel.",
    "Dieses Produkt ist für keinen Verkaufskanal ausgewählt.",
    "Ce produit n’est sélectionné pour aucun canal de vente.",
    "Este producto no está seleccionado para ningún canal de venta.",
  ],
  inactiveProduct: [
    "This product is inactive. Channel selection does not activate it.",
    "Dieses Produkt ist inaktiv. Die Kanalauswahl aktiviert es nicht.",
    "Ce produit est inactif. La sélection d’un canal ne l’active pas.",
    "Este producto está inactivo. Seleccionar un canal no lo activa.",
  ],
  inactive: [
    "Channel inactive",
    "Kanal inaktiv",
    "Canal inactif",
    "Canal inactivo",
  ],
  private: [
    "Private channel",
    "Privater Kanal",
    "Canal privé",
    "Canal privado",
  ],
  excluded: [
    "The channel’s product selection excludes this product.",
    "Die Produktauswahl des Kanals schließt dieses Produkt aus.",
    "La sélection de produits du canal exclut ce produit.",
    "La selección de productos del canal excluye este producto.",
  ],
  unavailable: [
    "Unavailable category",
    "Nicht verfügbare Kategorie",
    "Catégorie indisponible",
    "Categoría no disponible",
  ],
} as const;
export function useProductAssignmentText() {
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

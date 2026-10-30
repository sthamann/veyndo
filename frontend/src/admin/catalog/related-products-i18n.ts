/** Related-product selection and current-state guidance in all Studio interface languages. */
import { useLocale } from "../../shared/i18n/i18n";
const words = {
  selected: [
    "Selected recommendations",
    "Ausgewählte Empfehlungen",
    "Recommandations sélectionnées",
    "Recomendaciones seleccionadas",
  ],
  hint: [
    "Choose up to 20 products and set their order. Save the product to apply your selection. The shop only shows products available in the current sales channel.",
    "Wähle bis zu 20 Produkte und lege ihre Reihenfolge fest. Speichere das Produkt, um die Auswahl zu übernehmen. Im Shop erscheinen nur Produkte, die im aktuellen Verkaufskanal verfügbar sind.",
    "Choisissez jusqu’à 20 produits et leur ordre. Enregistrez le produit pour appliquer la sélection. La boutique affiche uniquement les produits disponibles dans le canal actuel.",
    "Elige hasta 20 productos y su orden. Guarda el producto para aplicar la selección. La tienda solo muestra productos disponibles en el canal actual.",
  ],
  empty: [
    "No products selected yet. Find matching accessories or complementary products below.",
    "Noch keine Produkte ausgewählt. Suche unten nach passendem Zubehör oder ergänzenden Produkten.",
    "Aucun produit sélectionné. Recherchez des accessoires ou produits complémentaires ci-dessous.",
    "Aún no hay productos seleccionados. Busca accesorios o productos complementarios abajo.",
  ],
  search: [
    "Find products",
    "Produkte finden",
    "Rechercher des produits",
    "Buscar productos",
  ],
  earlier: [
    "Move {name} earlier",
    "{name} nach vorne verschieben",
    "Avancer {name}",
    "Mover {name} antes",
  ],
  later: [
    "Move {name} later",
    "{name} nach hinten verschieben",
    "Reculer {name}",
    "Mover {name} después",
  ],
  remove: [
    "Remove {name}",
    "{name} entfernen",
    "Retirer {name}",
    "Quitar {name}",
  ],
  missing: [
    "Product unavailable",
    "Produkt nicht verfügbar",
    "Produit indisponible",
    "Producto no disponible",
  ],
  inactive: ["Inactive", "Inaktiv", "Inactif", "Inactivo"],
  loading: [
    "Loading products…",
    "Produkte werden geladen…",
    "Chargement des produits…",
    "Cargando productos…",
  ],
  noMatches: [
    "No matching products. Try another name or product number.",
    "Keine passenden Produkte. Versuche einen anderen Namen oder eine Produktnummer.",
    "Aucun produit correspondant. Essayez un autre nom ou numéro de produit.",
    "No hay productos coincidentes. Prueba otro nombre o número de producto.",
  ],
  more: [
    "Load more products",
    "Weitere Produkte laden",
    "Charger plus de produits",
    "Cargar más productos",
  ],
  retry: ["Try again", "Erneut versuchen", "Réessayer", "Volver a intentar"],
  limit: [
    "20 products selected. Remove one to choose another.",
    "20 Produkte ausgewählt. Entferne eines, um ein anderes auszuwählen.",
    "20 produits sélectionnés. Retirez-en un pour en choisir un autre.",
    "20 productos seleccionados. Elimina uno para elegir otro.",
  ],
  count: [
    "{count} of 20 selected",
    "{count} von 20 ausgewählt",
    "{count} sur 20 sélectionnés",
    "{count} de 20 seleccionados",
  ],
} as const;
export function useRelatedProductsText() {
  const { locale } = useLocale();
  return (
    key: keyof typeof words,
    values: Record<string, string | number> = {},
  ) =>
    Object.entries(values).reduce(
      (s, [k, v]) => s.replaceAll(`{${k}}`, String(v)),
      words[key][
        { "en-GB": 0, "de-DE": 1, "fr-FR": 2, "es-ES": 3 }[locale]
      ] as string,
    );
}

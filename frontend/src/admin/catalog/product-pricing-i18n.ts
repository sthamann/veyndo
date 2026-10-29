/** Interface guidance for native product prices, optional conditions and availability. */
import { useLocale } from "../../shared/i18n/i18n";
const words = {
  sale: [
    "Selling price & tax",
    "Verkaufspreis & Steuern",
    "Prix de vente et taxes",
    "Precio de venta e impuestos",
  ],
  saleHint: [
    "Gross base price in {currency}. Tax rules and currency settings determine the price at checkout.",
    "Brutto-Ausgangspreis in {currency}. Steuerregeln und Währungseinstellungen bestimmen den Preis im Checkout.",
    "Prix brut de base en {currency}. Les règles fiscales et les paramètres de devise déterminent le prix à la commande.",
    "Precio bruto base en {currency}. Las reglas fiscales y la configuración de divisas determinan el precio al pagar.",
  ],
  availability: [
    "Stock & delivery",
    "Bestand & Lieferung",
    "Stock et livraison",
    "Existencias y entrega",
  ],
  availabilityHint: [
    "Available quantity and delivery time. Saving other fields preserves stock changed by new orders.",
    "Verfügbare Menge und Lieferzeit. Beim Speichern anderer Felder bleibt der durch neue Bestellungen geänderte Bestand erhalten.",
    "Quantité disponible et délai de livraison. Enregistrer les autres champs préserve le stock modifié par de nouvelles commandes.",
    "Cantidad disponible y plazo de entrega. Guardar otros campos conserva el stock modificado por nuevos pedidos.",
  ],
  comparison: [
    "Comparison prices",
    "Vergleichspreise",
    "Prix de comparaison",
    "Precios de comparación",
  ],
  comparisonHint: [
    "Optional list price and lowest price in the last 30 days, in the same base currency.",
    "Optionaler Streichpreis und niedrigster Preis der letzten 30 Tage in derselben Ausgangswährung.",
    "Prix barré facultatif et prix le plus bas des 30 derniers jours, dans la même devise de base.",
    "Precio anterior opcional y precio más bajo de los últimos 30 días, en la misma divisa base.",
  ],
  quantities: [
    "Order quantities",
    "Bestellmengen",
    "Quantités commandées",
    "Cantidades de pedido",
  ],
  quantitiesHint: [
    "Set a minimum, pack size or maximum per purchase. Leave the maximum empty for no limit.",
    "Mindestmenge, Abnahmeschritte oder Höchstmenge pro Einkauf festlegen. Ohne eingetragene Höchstmenge gilt kein Limit.",
    "Définissez un minimum, un conditionnement ou un maximum par achat. Laissez le maximum vide pour ne pas le limiter.",
    "Define un mínimo, un múltiplo o un máximo por compra. Deja el máximo vacío para no limitarlo.",
  ],
  currencies: [
    "Currencies & fixed prices",
    "Währungen & Festpreise",
    "Devises et prix fixes",
    "Divisas y precios fijos",
  ],
  tiersHint: [
    "Apply existing rules and quantity ranges to percentage discounts.",
    "Vorhandene Regeln und Mengenbereiche mit prozentualen Rabatten verbinden.",
    "Associez des règles existantes et des plages de quantités à des remises en pourcentage.",
    "Vincula reglas existentes e intervalos de cantidades a descuentos porcentuales.",
  ],
} as const;
export function useProductPricingText() {
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

/** Shared UI/browser-agent command descriptions and errors follow the active storefront language. */
import { getLocale } from "../../shared/i18n/i18n";
const words = {
  scope: [
    "Shop context changed or action cancelled",
    "Shop-Kontext geändert oder Aktion abgebrochen",
    "Contexte de boutique modifié ou action annulée",
    "Contexto de tienda cambiado o acción cancelada",
  ],
  query: [
    "Invalid catalogue query",
    "Ungültige Produktsuche",
    "Recherche de produits invalide",
    "Búsqueda de productos no válida",
  ],
  items: [
    "Invalid cart items",
    "Ungültige Warenkorbpositionen",
    "Articles du panier invalides",
    "Artículos del carrito no válidos",
  ],
  open: [
    "Open the shop cart before editing",
    "Öffne vor dem Bearbeiten den Warenkorb",
    "Ouvrez le panier avant modification",
    "Abre el carrito antes de editar",
  ],
  search: [
    "Search products in the current Veyndo shop and sales channel.",
    "Suche Produkte im aktuellen Veyndo-Shop und Verkaufskanal.",
    "Rechercher des produits dans la boutique et le canal Veyndo actuels.",
    "Busca productos en la tienda y canal Veyndo actuales.",
  ],
  read: [
    "Read the cart without private buyer or session data.",
    "Lies den Warenkorb ohne private Käufer- oder Sitzungsdaten.",
    "Lire le panier sans données privées ni de session.",
    "Consulta el carrito sin datos privados ni de sesión.",
  ],
  update: [
    "Replace cart items on buyer request. Does not place an order.",
    "Ersetze Warenkorbpositionen auf Kundenwunsch. Löst keine Bestellung aus.",
    "Remplacer les articles à la demande du client. Ne passe pas de commande.",
    "Reemplaza artículos a petición del cliente. No realiza pedidos.",
  ],
  review: [
    "Open checkout for the buyer to review address, payment and total. Never submits an order.",
    "Öffne den Checkout zur Prüfung von Adresse, Zahlung und Endbetrag. Löst keine Bestellung aus.",
    "Ouvrir le paiement pour vérifier adresse, paiement et total. Ne soumet jamais de commande.",
    "Abre el checkout para revisar dirección, pago y total. Nunca realiza el pedido.",
  ],
} as const;
export const storefrontActionText = (key: keyof typeof words) =>
  words[key][{ "en-GB": 0, "de-DE": 1, "fr-FR": 2, "es-ES": 3 }[getLocale()]];

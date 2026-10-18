/** Original CRM evidence uses the same Studio locale as the reviewed migration command. */
import { useLocale } from "../../../../frontend/src/shared/i18n/i18n";
const words = {
  email: [
    "Original email",
    "Ursprüngliche E-Mail",
    "E-mail d’origine",
    "Correo original",
  ],
  billing: [
    "Billing address",
    "Rechnungsadresse",
    "Adresse de facturation",
    "Dirección de facturación",
  ],
  shipping: [
    "Shipping address",
    "Lieferadresse",
    "Adresse de livraison",
    "Dirección de envío",
  ],
  additional: [
    "Additional addresses",
    "Weitere Adressen",
    "Autres adresses",
    "Direcciones adicionales",
  ],
  lines: [
    "Original order items",
    "Ursprüngliche Bestellpositionen",
    "Articles de commande d’origine",
    "Artículos originales del pedido",
  ],
  payment: [
    "Payment status at source",
    "Zahlungsstatus in der Quelle",
    "État du paiement à la source",
    "Estado del pago en origen",
  ],
  order: [
    "Order status at source",
    "Bestellstatus in der Quelle",
    "État de commande à la source",
    "Estado del pedido en origen",
  ],
  date: [
    "Original order date",
    "Ursprüngliches Bestelldatum",
    "Date de commande d’origine",
    "Fecha original del pedido",
  ],
  notice: [
    "Historical evidence only. No customer login, new payment, receipt or stock movement is created.",
    "Nur ursprüngliche Geschäftsdaten. Es entstehen kein Kundenzugang, keine neue Zahlung, kein Beleg und keine Lagerbewegung.",
    "Données historiques uniquement. Aucun accès client, nouveau paiement, reçu ou mouvement de stock n’est créé.",
    "Solo datos históricos. No se crea acceso de cliente, pago nuevo, recibo ni movimiento de inventario.",
  ],
} as const;
export function useCRMText() {
  const { locale } = useLocale();
  const i = locale.startsWith("de")
    ? 1
    : locale.startsWith("fr")
      ? 2
      : locale.startsWith("es")
        ? 3
        : 0;
  return (key: keyof typeof words) => words[key][i];
}

/** Review and coupon evidence labels share the current Studio interface locale. */
import { useLocale } from "../../../../frontend/src/shared/i18n/i18n";
const words = {
  author: [
    "Original author",
    "Ursprünglicher Autor",
    "Auteur original",
    "Autor original",
  ],
  rating: ["Rating", "Bewertung", "Note", "Valoración"],
  created: [
    "Original date",
    "Ursprüngliches Datum",
    "Date d’origine",
    "Fecha original",
  ],
  sourceClaim: [
    "Source purchase claim",
    "Kaufbestätigung laut Quelle",
    "Achat déclaré par la source",
    "Compra declarada por el origen",
  ],
  moderation: [
    "Hidden until native moderation. Source verification does not prove a purchase in Veyndo.",
    "Bis zur nativen Moderation unsichtbar. Die Quellbestätigung belegt keinen Kauf in Veyndo.",
    "Masqué avant modération native. La vérification source ne prouve pas un achat dans Veyndo.",
    "Oculta hasta la moderación nativa. La verificación original no prueba una compra en Veyndo.",
  ],
  currency: [
    "Original currency only",
    "Nur ursprüngliche Währung",
    "Devise d’origine uniquement",
    "Solo moneda original",
  ],
  remaining: [
    "Remaining redemptions",
    "Verbleibende Einlösungen",
    "Utilisations restantes",
    "Usos restantes",
  ],
  used: [
    "Already used at source",
    "Bereits in der Quelle genutzt",
    "Déjà utilisé à la source",
    "Usos anteriores en origen",
  ],
  unlimited: [
    "Unlimited at source",
    "In der Quelle unbegrenzt",
    "Illimité à la source",
    "Ilimitado en origen",
  ],
  minimum: [
    "Minimum spend",
    "Mindesteinkauf",
    "Achat minimum",
    "Compra mínima",
  ],
  maximum: ["Maximum spend", "Höchsteinkauf", "Achat maximum", "Compra máxima"],
  expires: ["Expires at", "Gültig bis", "Expiration", "Caducidad"],
  exclusive: [
    "Cannot be combined",
    "Nicht kombinierbar",
    "Non cumulable",
    "No acumulable",
  ],
  inactive: [
    "Inactive until explicit native review. Only the original currency applies; past purchases are not new redemptions.",
    "Bis zur ausdrücklichen nativen Prüfung inaktiv. Nur die ursprüngliche Währung gilt; alte Käufe zählen nicht als neue Einlösungen.",
    "Inactif avant vérification native explicite. Uniquement la devise d’origine ; les anciens achats ne sont pas de nouvelles utilisations.",
    "Inactivo hasta revisión nativa explícita. Solo moneda original; las compras anteriores no son nuevos usos.",
  ],
  yes: ["Yes", "Ja", "Oui", "Sí"],
  no: ["No", "Nein", "Non", "No"],
} as const;
export function useFeedbackText() {
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

/** Frozen rule comparison copy; the sample and decision boundary remain explicit. */
import { useLocale } from "../../shared/i18n/i18n";
const words = {
  title: [
    "Test this change on past orders",
    "Änderung an früheren Bestellungen testen",
    "Tester ce changement sur des commandes passées",
    "Probar este cambio con pedidos anteriores",
  ],
  hint: [
    "Compare the saved condition with your draft using recorded Flow inputs. Orders, prices and actions stay unchanged.",
    "Vergleiche die gespeicherte Bedingung mit deinem Entwurf anhand aufgezeichneter Flow-Daten. Bestellungen, Preise und Aktionen bleiben unverändert.",
    "Comparez la condition enregistrée et votre brouillon sur les données des flux. Commandes, prix et actions restent inchangés.",
    "Compara la condición guardada y tu borrador con los datos de flujos. Pedidos, precios y acciones no cambian.",
  ],
  sample: [
    "Only recorded order-placement events from this Flow are included. Unmatched events were not recorded. This is a condition test, not a new checkout calculation or a revenue forecast. Referenced rules use their recorded versions.",
    "Enthalten sind nur aufgezeichnete Bestelleingänge dieses Flows. Damals nicht passende Ereignisse wurden nicht erfasst. Geprüft wird die Bedingung, keine neue Checkout-Berechnung oder Umsatzprognose. Verknüpfte Regeln verwenden ihre aufgezeichneten Versionen.",
    "Seuls les événements de commande enregistrés par ce flux sont inclus. Les événements non retenus n’ont pas été enregistrés. Le test porte sur la condition, sans recalcul de paiement ni prévision de revenus. Les règles liées utilisent leurs versions enregistrées.",
    "Solo se incluyen eventos de pedido registrados por este flujo. Los eventos que no coincidían no se registraron. Se prueba la condición, sin recalcular el pago ni predecir ingresos. Las reglas vinculadas usan sus versiones registradas.",
  ],
  flow: [
    "Use records from Flow",
    "Aufzeichnungen aus Flow",
    "Utiliser les données du flux",
    "Usar registros del flujo",
  ],
  choose: [
    "Choose a Flow",
    "Flow auswählen",
    "Choisir un flux",
    "Elegir un flujo",
  ],
  limit: [
    "Latest records to check",
    "Letzte Aufzeichnungen prüfen",
    "Derniers enregistrements à tester",
    "Últimos registros a probar",
  ],
  run: [
    "Compare conditions",
    "Bedingungen vergleichen",
    "Comparer les conditions",
    "Comparar condiciones",
  ],
  running: ["Comparing…", "Vergleich läuft …", "Comparaison…", "Comparando…"],
  save: [
    "Save this rule once before comparing a draft with it.",
    "Speichere diese Regel zuerst, um danach einen Entwurf mit ihr zu vergleichen.",
    "Enregistrez cette règle avant de comparer un brouillon.",
    "Guarda esta regla antes de comparar un borrador.",
  ],
  advanced: [
    "Return to the visual rule editor to compare its current draft.",
    "Wechsle zum visuellen Regeleditor, um dessen aktuellen Entwurf zu vergleichen.",
    "Revenez à l’éditeur visuel pour comparer le brouillon actuel.",
    "Vuelve al editor visual para comparar el borrador actual.",
  ],
  empty: [
    "This Flow has no stored records yet. Choose a Flow that has processed orders.",
    "Für diesen Flow gibt es noch keine Aufzeichnungen. Wähle einen Flow, der bereits Bestellungen verarbeitet hat.",
    "Ce flux n’a pas encore de données. Choisissez un flux ayant traité des commandes.",
    "Este flujo aún no tiene registros. Elige uno que haya procesado pedidos.",
  ],
  checked: ["Evaluated", "Ausgewertet", "Évalués", "Evaluados"],
  changed: [
    "Different result",
    "Anderes Ergebnis",
    "Résultat différent",
    "Resultado distinto",
  ],
  unavailable: [
    "Not evaluable",
    "Nicht auswertbar",
    "Non évaluable",
    "No evaluable",
  ],
  captured: [
    "Recorded at",
    "Aufgezeichnet am",
    "Enregistré le",
    "Registrado el",
  ],
  before: [
    "Saved condition",
    "Gespeicherte Bedingung",
    "Condition enregistrée",
    "Condición guardada",
  ],
  after: [
    "Draft condition",
    "Bedingung im Entwurf",
    "Condition du brouillon",
    "Condición del borrador",
  ],
  yes: ["Matches", "Trifft zu", "Correspond", "Coincide"],
  no: ["Does not match", "Trifft nicht zu", "Ne correspond pas", "No coincide"],
  missing: [
    "Required recorded data is missing or unsupported. Current data was not substituted.",
    "Benötigte aufgezeichnete Daten fehlen oder werden nicht unterstützt. Aktuelle Daten wurden nicht eingesetzt.",
    "Les données enregistrées nécessaires sont absentes ou non prises en charge. Aucune donnée actuelle ne les remplace.",
    "Faltan datos registrados necesarios o no son compatibles. No se sustituyeron por datos actuales.",
  ],
  error: [
    "Comparison could not be completed. Reload the rule and check your access to orders and customer data.",
    "Der Vergleich konnte nicht abgeschlossen werden. Lade die Regel neu und prüfe deinen Zugriff auf Bestellungen und Kundendaten.",
    "La comparaison a échoué. Rechargez la règle et vérifiez vos droits sur les commandes et clients.",
    "No se pudo completar la comparación. Recarga la regla y comprueba tus permisos sobre pedidos y clientes.",
  ],
  evidence: [
    "Comparison evidence",
    "Vergleichsnachweis",
    "Preuve de comparaison",
    "Evidencia de comparación",
  ],
} as const;
export function useRuleHistoryText() {
  const { locale } = useLocale();
  const index = locale.startsWith("de")
    ? 1
    : locale.startsWith("fr")
      ? 2
      : locale.startsWith("es")
        ? 3
        : 0;
  return (key: keyof typeof words) => words[key][index];
}

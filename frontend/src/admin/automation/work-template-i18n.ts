/** Reviewed-work Flow vocabulary in every Studio interface language. */
import { useLocale } from "../../shared/i18n/i18n";
const words = {
  repeat: [
    "Repeat reviewed work",
    "Geprüften Auftrag wiederholen",
    "Répéter le travail validé",
    "Repetir trabajo revisado",
  ],
  loading: [
    "Loading your protected source task…",
    "Dein geschützter Quellauftrag wird geladen …",
    "Chargement de votre tâche source protégée…",
    "Cargando tu tarea de origen protegida…",
  ],
  unavailable: [
    "The source task is unavailable. Use your completed task in this same private workspace with its original permissions.",
    "Der Quellauftrag ist nicht verfügbar. Verwende deinen erledigten Auftrag in derselben privaten Arbeitsumgebung mit seinen ursprünglichen Rechten.",
    "La tâche source est indisponible. Utilisez votre tâche terminée dans le même espace privé avec ses droits d’origine.",
    "La tarea de origen no está disponible. Usa tu tarea completada en el mismo espacio privado con sus permisos originales.",
  ],

  reuse: [
    "Reuse as a Flow",
    "Als Flow wiederverwenden",
    "Réutiliser comme flux",
    "Reutilizar como flujo",
  ],
  title: [
    "Prepare these steps for review",
    "Diese Schritte zur Prüfung vorbereiten",
    "Préparer ces étapes pour validation",
    "Preparar estos pasos para revisión",
  ],
  hint: [
    "Each matching event prepares a new proposal in this private workspace. You review it before anything changes. No model call is needed.",
    "Jedes passende Ereignis bereitet einen neuen Vorschlag in dieser privaten Arbeitsumgebung vor. Du prüfst ihn, bevor etwas geändert wird. Dafür ist kein Modellaufruf nötig.",
    "Chaque événement prépare une nouvelle proposition dans cet espace privé. Vous la validez avant toute modification. Aucun appel au modèle n’est nécessaire.",
    "Cada evento prepara una nueva propuesta en este espacio privado. La revisas antes de cambiar nada. No requiere una llamada al modelo.",
  ],
  limit: [
    "Maximum proposals per day (UTC)",
    "Höchstens so viele Vorschläge pro Tag (UTC)",
    "Propositions maximum par jour (UTC)",
    "Máximo de propuestas al día (UTC)",
  ],
  field: ["Input field", "Eingabefeld", "Champ d’entrée", "Campo de entrada"],
  source: [
    "Use value from",
    "Wert verwenden aus",
    "Utiliser la valeur de",
    "Usar el valor de",
  ],
  fixed: [
    "Saved value",
    "Gespeicherter Wert",
    "Valeur enregistrée",
    "Valor guardado",
  ],
  product: [
    "Product that triggered the event",
    "Produkt, das das Ereignis ausgelöst hat",
    "Produit ayant déclenché l’événement",
    "Producto que activó el evento",
  ],
  revision: [
    "Product revision in the event",
    "Produktrevision im Ereignis",
    "Révision du produit dans l’événement",
    "Revisión del producto del evento",
  ],
  order: [
    "Order in the event",
    "Bestellung im Ereignis",
    "Commande de l’événement",
    "Pedido del evento",
  ],
  document: [
    "Document in the event",
    "Dokument im Ereignis",
    "Document de l’événement",
    "Documento del evento",
  ],
  generated: [
    "New identifier for each run",
    "Neue Kennung für jeden Durchlauf",
    "Nouvel identifiant à chaque exécution",
    "Nuevo identificador en cada ejecución",
  ],
  exact: [
    "Saved operation inputs",
    "Gespeicherte Eingaben des Schritts",
    "Entrées enregistrées de l’étape",
    "Entradas guardadas del paso",
  ],
  empty: [
    "Start from a completed task in My workspace.",
    "Starte mit einem erledigten Auftrag unter Mein Arbeitsplatz.",
    "Commencez par une tâche terminée dans Mon espace.",
    "Empieza desde una tarea completada en Mi espacio.",
  ],
  revisions: [
    "Saved revisions remain binding. A changed target needs a new review; it is never overwritten silently.",
    "Gespeicherte Revisionen bleiben verbindlich. Ein geändertes Ziel braucht eine neue Prüfung und wird niemals unbemerkt überschrieben.",
    "Les révisions enregistrées restent contraignantes. Une cible modifiée exige une nouvelle validation.",
    "Las revisiones guardadas siguen siendo obligatorias. Un destino modificado necesita una nueva revisión.",
  ],
} as const;
export function workTemplateText(locale: string, key: keyof typeof words) {
  const index = locale.startsWith("de")
    ? 1
    : locale.startsWith("fr")
      ? 2
      : locale.startsWith("es")
        ? 3
        : 0;
  return words[key][index];
}

export function useWorkTemplateText() {
  const { locale } = useLocale();
  return (key: keyof typeof words) => workTemplateText(locale, key);
}

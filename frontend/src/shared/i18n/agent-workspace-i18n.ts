/** Contextual merchant work, private source intake and real editor handoffs share plain translated labels. */
import { useLocale } from "./i18n";
export const agentWorkspaceWords = {
  work: [
    "Your next steps",
    "Deine nächsten Schritte",
    "Vos prochaines étapes",
    "Tus próximos pasos",
  ],
  hint: [
    "From current shop data. Open, review and edit in the usual workspace.",
    "Aus aktuellen Shop-Daten. Öffnen, prüfen und im gewohnten Arbeitsbereich bearbeiten.",
    "Selon les données actuelles. Ouvrez, vérifiez et modifiez dans l’espace habituel.",
    "Según datos actuales. Abre, revisa y edita en el espacio habitual.",
  ],
  stock: [
    "Check sold-out product",
    "Ausverkauftes Produkt prüfen",
    "Vérifier un produit épuisé",
    "Revisar producto agotado",
  ],
  run: [
    "Continue an interrupted task",
    "Unterbrochene Aufgabe prüfen",
    "Vérifier une tâche interrompue",
    "Revisar tarea interrumpida",
  ],
  translation: [
    "Review prepared translations",
    "Vorbereitete Übersetzungen prüfen",
    "Vérifier les traductions",
    "Revisar traducciones",
  ],
  app: [
    "Check failed app work",
    "Fehlgeschlagene App-Aufgabe prüfen",
    "Vérifier une tâche d’application",
    "Revisar tarea de aplicación",
  ],
  empty: [
    "No open items in this selection.",
    "Keine offenen Punkte in dieser Auswahl.",
    "Aucun point ouvert dans cette sélection.",
    "No hay tareas abiertas en esta selección.",
  ],
  reload: ["Refresh", "Aktualisieren", "Actualiser", "Actualizar"],
  error: [
    "Could not load current work.",
    "Aktuelle Aufgaben konnten nicht geladen werden.",
    "Impossible de charger les tâches.",
    "No se pudieron cargar las tareas.",
  ],
  source: [
    "Add a document",
    "Dokument hinzufügen",
    "Ajouter un document",
    "Añadir documento",
  ],
  guidance: [
    "Remember my instructions",
    "Meine Vorgaben merken",
    "Mémoriser mes consignes",
    "Recordar mis instrucciones",
  ],
  guidanceHint: [
    "Saved privately as a versioned source. The agent reads your preferences on future tasks. Archive the source to withdraw them; permissions and approvals always apply.",
    "Wird privat als versionierte Quelle gespeichert. Der Agent berücksichtigt deine Vorgaben bei künftigen Aufgaben. Durch Archivieren ziehst du sie zurück; Rechte und Freigaben gelten weiterhin.",
    "Enregistré comme source privée versionnée pour les prochaines tâches. Archivez pour retirer vos consignes; droits et validations restent applicables.",
    "Se guarda como fuente privada versionada para futuras tareas. Archívala para retirar instrucciones; siguen vigentes permisos y aprobaciones.",
  ],
  close: ["Close", "Schließen", "Fermer", "Cerrar"],
  openView: [
    "Open editable list",
    "Bearbeitbare Liste öffnen",
    "Ouvrir la liste modifiable",
    "Abrir lista editable",
  ],
  context: [
    "Working context",
    "Arbeitskontext",
    "Contexte de travail",
    "Contexto de trabajo",
  ],
} as const;
export function useAgentWorkspaceText() {
  const { locale } = useLocale();
  const index =
    ({ en: 0, de: 1, fr: 2, es: 3 } as Record<string, number>)[
      locale.slice(0, 2)
    ] ?? 0;
  return (key: keyof typeof agentWorkspaceWords) =>
    agentWorkspaceWords[key][index];
}

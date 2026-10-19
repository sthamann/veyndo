/** Work-plan vocabulary distinguishes saved context from verified migration effects. */
import { useLocale } from "../../../../frontend/src/shared/i18n/i18n";
const words = {
  invalid: [
    "An invalid saved plan was skipped. Review its native record before using it.",
    "Ein ungültiger gespeicherter Plan wurde übersprungen. Prüfe seinen Datensatz vor der Verwendung.",
    "Un plan invalide a été ignoré. Vérifiez son enregistrement avant utilisation.",
    "Se omitió un plan inválido. Revisa su registro antes de usarlo.",
  ],
  plans: [
    "Migration work plans",
    "Migrationspläne",
    "Plans de migration",
    "Planes de migración",
  ],
  name: [
    "Name this migration",
    "Name dieser Migration",
    "Nom de la migration",
    "Nombre de esta migración",
  ],
  create: [
    "Save work plan",
    "Arbeitsplan speichern",
    "Enregistrer le plan",
    "Guardar plan",
  ],
  all: [
    "All jobs / single-page mode",
    "Alle Aufträge / einzelne Seiten",
    "Toutes les tâches / pages seules",
    "Todas las tareas / páginas individuales",
  ],
  notice: [
    "A saved plan connects your source, private preview and planned areas. It is not a completed shop migration. Every page still requires review; current target comparison and final cutover remain separate.",
    "Ein gespeicherter Plan verbindet Quelle, private Vorschau und geplante Bereiche. Er ist keine abgeschlossene Shop-Migration. Jede Seite braucht weiterhin eine Prüfung; aktueller Zielabgleich und endgültige Umstellung bleiben getrennt.",
    "Le plan relie source, aperçu privé et domaines prévus. Il ne prouve pas une migration terminée. Chaque page doit être vérifiée ; comparaison actuelle et bascule finale restent séparées.",
    "El plan conecta origen, vista privada y áreas previstas. No acredita una migración terminada. Cada página requiere revisión; comparación actual y cambio final son independientes.",
  ],
  areas: [
    "Planned areas",
    "Geplante Bereiche",
    "Domaines prévus",
    "Áreas previstas",
  ],
  more: [
    "Load older jobs",
    "Ältere Aufträge laden",
    "Charger les tâches précédentes",
    "Cargar tareas anteriores",
  ],
  morePlans: [
    "More saved plans",
    "Weitere gespeicherte Pläne",
    "Autres plans enregistrés",
    "Más planes guardados",
  ],
  linked: [
    "Jobs shown for this plan",
    "Angezeigte Aufträge dieses Plans",
    "Tâches affichées pour ce plan",
    "Tareas mostradas para este plan",
  ],
  empty: [
    "No linked jobs yet",
    "Noch keine verknüpften Aufträge",
    "Aucune tâche liée",
    "Aún no hay tareas vinculadas",
  ],
  preview: [
    "Private preview saved",
    "Private Vorschau gespeichert",
    "Aperçu privé enregistré",
    "Vista privada guardada",
  ],
} as const;
export function useRunText() {
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

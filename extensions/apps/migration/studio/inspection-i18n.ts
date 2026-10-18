/** Source inspection is a durable read, distinct from a reviewed native import. */
import { useLocale } from "../../../../frontend/src/shared/i18n/i18n";
const words = {
  ready: [
    "Source ready for review",
    "Quelle bereit zur Prüfung",
    "Source prête à vérifier",
    "Origen listo para revisar",
  ],
  open: [
    "Open source review",
    "Quellprüfung öffnen",
    "Ouvrir la vérification",
    "Abrir revisión del origen",
  ],
  failed: [
    "Source inspection stopped. Open the saved job details before retrying.",
    "Quellprüfung angehalten. Prüfe den gespeicherten Auftrag vor einem erneuten Versuch.",
    "Vérification arrêtée. Consultez la tâche avant de réessayer.",
    "Revisión detenida. Consulta la tarea guardada antes de reintentar.",
  ],
} as const;
export function useInspectionText() {
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

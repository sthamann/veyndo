/** Migration vocabulary distinguishes observed comparisons from final cutover. */
import { useLocale } from "../../../../frontend/src/shared/i18n/i18n";
const words = {
  empty: [
    "The source page has no records. Confirm this observation to continue without creating data.",
    "Diese Quellseite enthält keine Datensätze. Bestätige diesen Prüfstand, um ohne neue Daten fortzufahren.",
    "Cette page source est vide. Confirmez ce résultat pour continuer sans créer de données.",
    "Esta página de origen está vacía. Confirma el resultado para continuar sin crear datos.",
  ],
  acceptEmpty: [
    "Confirm empty source page",
    "Leere Quellseite bestätigen",
    "Confirmer la page source vide",
    "Confirmar página de origen vacía",
  ],
  title: [
    "Your migration, step by step",
    "Deine Migration, Schritt für Schritt",
    "Votre migration, étape par étape",
    "Tu migración, paso a paso",
  ],
  notice: [
    "Review each page separately. Saved evidence survives job archival. Comparisons show the last check, not a final cutover.",
    "Gib jede Seite einzeln frei. Gespeicherte Nachweise bleiben nach der Job-Archivierung erhalten. Der Abgleich zeigt den letzten Prüfstand, keine endgültige Shop-Umstellung.",
    "Approuvez chaque page séparément. Les preuves restent après archivage. La comparaison décrit le dernier contrôle, pas la bascule finale.",
    "Aprueba cada página por separado. La evidencia persiste tras archivar tareas. La comparación muestra la última revisión, no el cambio final.",
  ],
  next: [
    "Review next page",
    "Nächste Seite prüfen",
    "Vérifier la page suivante",
    "Revisar página siguiente",
  ],
  reviewAgain: [
    "Review source page again",
    "Quellseite neu prüfen",
    "Vérifier à nouveau la page source",
    "Volver a revisar la página de origen",
  ],
  resume: [
    "Resume reviewed page",
    "Geprüfte Seite fortsetzen",
    "Reprendre la page vérifiée",
    "Reanudar página revisada",
  ],
  compare: [
    "Check target again",
    "Ziel erneut abgleichen",
    "Comparer à nouveau la cible",
    "Comparar destino de nuevo",
  ],
  done: [
    "All selected areas have been checked",
    "Alle gewählten Bereiche wurden geprüft",
    "Tous les domaines choisis ont été vérifiés",
    "Se revisaron todas las áreas elegidas",
  ],
  matching: [
    "Matching records",
    "Übereinstimmende Datensätze",
    "Enregistrements identiques",
    "Registros coincidentes",
  ],
  changed: [
    "Changed records",
    "Geänderte Datensätze",
    "Enregistrements modifiés",
    "Registros modificados",
  ],
  missing: [
    "Missing records",
    "Fehlende Datensätze",
    "Enregistrements manquants",
    "Registros ausentes",
  ],
  more: [
    "Load more saved pages before continuing",
    "Weitere gespeicherte Seiten vor dem Fortsetzen laden",
    "Charger les pages enregistrées avant de continuer",
    "Cargar más páginas guardadas antes de continuar",
  ],
  active: [
    "A page is running. Its result determines the next step.",
    "Eine Seite wird bearbeitet. Ihr Ergebnis bestimmt den nächsten Schritt.",
    "Une page est en cours. Son résultat détermine la suite.",
    "Una página está en curso. Su resultado determina el siguiente paso.",
  ],
  cycle: [
    "The saved cursor chain is inconsistent. Review the source again.",
    "Die gespeicherte Seitenfolge ist widersprüchlich. Prüfe die Quelle erneut.",
    "La chaîne de pages est incohérente. Vérifiez la source.",
    "La secuencia de páginas es incoherente. Revisa el origen.",
  ],
  saved: [
    "Saved page evidence",
    "Gespeicherte Seitennachweise",
    "Preuves de pages enregistrées",
    "Evidencia de páginas guardada",
  ],
  checked: [
    "Last target check",
    "Letzter Zielabgleich",
    "Dernier contrôle cible",
    "Última revisión del destino",
  ],
} as const;
export function useProgressText() {
  const { locale } = useLocale();
  const n = locale.startsWith("de")
    ? 1
    : locale.startsWith("fr")
      ? 2
      : locale.startsWith("es")
        ? 3
        : 0;
  return (key: keyof typeof words) => words[key][n];
}

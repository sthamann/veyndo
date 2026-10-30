/** Release review vocabulary keeps simulated commerce evidence distinct from publication approval. */
import { useLocale } from "../../shared/i18n/i18n";
const words = {
  title: [
    "Customer tests before publication",
    "Kundentests vor der Veröffentlichung",
    "Tests clients avant publication",
    "Pruebas de clientes antes de publicar",
  ],
  hint: [
    "Review a saved test from this sandbox alongside your changes. Tests run through the commerce API; they do not inspect the page layout or automatically approve publication.",
    "Prüfe einen gespeicherten Test dieser Sandbox zusammen mit deinen Änderungen. Die Tests verwenden die Commerce-API. Sie prüfen keine Seitendarstellung und geben keine Veröffentlichung automatisch frei.",
    "Consultez un test enregistré de cet espace privé avec vos modifications. Les tests utilisent l’API commerce ; ils ne vérifient pas la mise en page et n’approuvent pas automatiquement la publication.",
    "Revisa una prueba guardada de este entorno privado junto con tus cambios. Las pruebas usan la API de comercio; no revisan el diseño ni aprueban automáticamente la publicación.",
  ],
  select: [
    "Saved customer test",
    "Gespeicherter Kundentest",
    "Test client enregistré",
    "Prueba de clientes guardada",
  ],
  choose: [
    "Choose a test",
    "Test auswählen",
    "Choisir un test",
    "Seleccionar una prueba",
  ],
  empty: [
    "You have no saved customer tests in this sandbox yet.",
    "Du hast in dieser Sandbox noch keine Kundentests gespeichert.",
    "Vous n’avez pas encore de tests clients enregistrés dans cet espace privé.",
    "Aún no tienes pruebas de clientes guardadas en este entorno privado.",
  ],
  refresh: [
    "Refresh tests and configuration check",
    "Tests und Konfigurationsprüfung aktualisieren",
    "Actualiser les tests et la configuration",
    "Actualizar pruebas y comprobación de configuración",
  ],
  loading: [
    "Loading saved tests…",
    "Gespeicherte Tests werden geladen …",
    "Chargement des tests enregistrés…",
    "Cargando pruebas guardadas…",
  ],
  open: [
    "Open this test and repeat",
    "Diesen Test öffnen und wiederholen",
    "Ouvrir et répéter ce test",
    "Abrir y repetir esta prueba",
  ],
  new: [
    "Prepare customer test",
    "Kundentest vorbereiten",
    "Préparer un test client",
    "Preparar prueba de clientes",
  ],
  checked: [
    "Results retrieved",
    "Ergebnisse abgerufen",
    "Résultats consultés",
    "Resultados consultados",
  ],
  openError: [
    "The customer test could not be opened. Try opening it again.",
    "Der Kundentest konnte nicht geöffnet werden. Versuche es erneut.",
    "Impossible d’ouvrir le test client. Réessayez de l’ouvrir.",
    "No se pudo abrir la prueba de clientes. Inténtalo de nuevo.",
  ],
  error: [
    "The customer tests could not be loaded. Refresh to try again.",
    "Die Kundentests konnten nicht geladen werden. Versuche es mit Aktualisieren erneut.",
    "Impossible de charger les tests clients. Actualisez pour réessayer.",
    "No se pudieron cargar las pruebas de clientes. Actualiza para reintentarlo.",
  ],
} as const;
export function useReleaseTestText() {
  const { locale } = useLocale();
  const index = { "en-GB": 0, "de-DE": 1, "fr-FR": 2, "es-ES": 3 }[locale];
  return (key: keyof typeof words) => words[key][index];
}

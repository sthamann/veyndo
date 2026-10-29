/** Upgrade admission vocabulary shared by installed package consent and App Studio. */
import { useLocale } from "../../shared/i18n/i18n";
const words = {
  diagnostic: [
    "Technical diagnostic",
    "Technische Diagnose",
    "Diagnostic technique",
    "Diagnóstico técnico",
  ],
  title: [
    "Upgrade check",
    "Upgrade-Prüfung",
    "Vérification de mise à jour",
    "Comprobación de actualización",
  ],
  check: [
    "Check before installing",
    "Vor Installation prüfen",
    "Vérifier avant installation",
    "Comprobar antes de instalar",
  ],
  checking: [
    "Checking stored data…",
    "Gespeicherte Daten werden geprüft…",
    "Vérification des données…",
    "Comprobando los datos…",
  ],
  ready: [
    "Ready for installation",
    "Bereit zur Installation",
    "Installation possible",
    "Lista para instalar",
  ],
  blocked: [
    "Resolve this before installing",
    "Vor der Installation beheben",
    "À résoudre avant installation",
    "Resuelve esto antes de instalar",
  ],
  hint: [
    "Checks the actual installer without saving changes. Installation checks the current data again.",
    "Prüft die echte Installation, ohne Änderungen zu speichern. Bei der Installation werden die aktuellen Daten erneut geprüft.",
    "Vérifie l’installation réelle sans enregistrer de modifications. Les données sont vérifiées à nouveau lors de l’installation.",
    "Comprueba la instalación real sin guardar cambios. Los datos se comprueban otra vez al instalar.",
  ],
  migration: [
    "Data migration required",
    "Datenmigration erforderlich",
    "Migration des données nécessaire",
    "Se requiere migración de datos",
  ],
  steps: [
    "Declared migration steps",
    "Definierte Migrationsschritte",
    "Étapes de migration déclarées",
    "Pasos de migración declarados",
  ],
  records: [
    "Stored records",
    "Gespeicherte Datensätze",
    "Enregistrements existants",
    "Registros guardados",
  ],
};
export function useUpgradeText() {
  const { locale } = useLocale();
  const index = Math.max(
    0,
    ["en-GB", "de-DE", "fr-FR", "es-ES"].indexOf(locale),
  );
  return (key: keyof typeof words) => words[key][index];
}

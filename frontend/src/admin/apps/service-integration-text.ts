/** Shared connector controls; provider-specific descriptions and field choices stay in app packages. */
import { useLocale } from "../../shared/i18n/i18n";
export const integrationWords = {
  saveFirst: [
    "Save connection changes before running an operation.",
    "Speichere die geänderte Verbindung vor dem Ausführen einer Aktion.",
    "Enregistrez la connexion avant une opération.",
    "Guarda la conexión antes de ejecutar una operación.",
  ],
  settings: [
    "Connection settings",
    "Verbindung einrichten",
    "Configurer la connexion",
    "Configurar conexión",
  ],
  credential: [
    "Private API key / Deploy Hook",
    "Privater API-Schlüssel / Deploy-Hook",
    "Clé API privée / Deploy Hook",
    "Clave API privada / Deploy Hook",
  ],
  protected: [
    "Stored encrypted. Leave blank to keep the existing credential. Credentials never appear in job results.",
    "Wird verschlüsselt gespeichert. Leer lassen, um den bisherigen Zugang zu behalten. Zugangsdaten erscheinen nie im Auftragsverlauf.",
    "Stocké chiffré. Laissez vide pour conserver la clé. Les résultats ne contiennent pas de secrets.",
    "Se guarda cifrado. Déjalo vacío para conservar la clave. Los resultados no contienen secretos.",
  ],
  saved: [
    "Credential stored",
    "Zugang gespeichert",
    "Accès enregistré",
    "Acceso guardado",
  ],
  missing: [
    "Credential required",
    "Zugang fehlt",
    "Accès requis",
    "Acceso requerido",
  ],
  enabled: [
    "Enable provider operations",
    "Anbieteraktionen aktivieren",
    "Activer les opérations",
    "Activar operaciones",
  ],
  save: [
    "Save connection",
    "Verbindung speichern",
    "Enregistrer",
    "Guardar conexión",
  ],
  run: [
    "Run explicit operation",
    "Gezielte Aktion ausführen",
    "Exécuter cette opération",
    "Ejecutar operación",
  ],
  refresh: [
    "Refresh status",
    "Status aktualisieren",
    "Actualiser l’état",
    "Actualizar estado",
  ],
  jobs: [
    "Recent jobs",
    "Letzte Aufträge",
    "Tâches récentes",
    "Tareas recientes",
  ],
  accepted: [
    "Accepted by provider; downstream completion is not yet confirmed.",
    "Vom Anbieter angenommen; der nachgelagerte Abschluss ist noch nicht bestätigt.",
    "Accepté par le fournisseur ; la fin du traitement n’est pas confirmée.",
    "Aceptado por el proveedor; la finalización aún no está confirmada.",
  ],
  scope: [
    "Only the explicit data below is transferred. Configure a Flow for repeated operations; this does not start an automatic full-shop sync.",
    "Nur die unten gewählten Daten werden übertragen. Für wiederkehrende Aktionen kannst du einen Flow einrichten; dies startet keinen automatischen Komplettabgleich.",
    "Seules les données indiquées sont transférées. Utilisez un Flow pour répéter l’action ; aucune synchronisation complète ne démarre.",
    "Solo se transfieren los datos indicados. Usa un Flow para repetir la acción; no se inicia una sincronización completa.",
  ],
  readonly: [
    "Managing this connection requires app-management rights.",
    "Zum Verwalten dieser Verbindung brauchst du App-Verwaltungsrechte.",
    "La gestion nécessite les droits de gestion des apps.",
    "Se requieren permisos para gestionar apps.",
  ],
  file: [
    "Catalogue JSON file (up to 50 records)",
    "Katalogdatei als JSON (bis 50 Datensätze)",
    "Fichier catalogue JSON (50 entrées maximum)",
    "Archivo de catálogo JSON (máximo 50 registros)",
  ],
  fileError: [
    "Choose a JSON array with 1–50 records and objectID/name fields, up to 40 KB.",
    "Wähle ein JSON-Array mit 1–50 Datensätzen, objectID/name und höchstens 40 KB.",
    "Choisissez un tableau JSON de 1–50 entrées avec objectID/name, 40 Ko maximum.",
    "Elige una lista JSON de 1–50 registros con objectID/name, máximo 40 KB.",
  ],
  records: [
    "Selected records",
    "Ausgewählte Datensätze",
    "Entrées choisies",
    "Registros elegidos",
  ],
  empty: [
    "No jobs yet",
    "Noch keine Aufträge",
    "Aucune tâche",
    "No hay tareas",
  ],
  queued: ["Queued", "Wartet", "En attente", "En cola"],
  running: ["Running", "Wird ausgeführt", "En cours", "En curso"],
  completed: [
    "Operation completed",
    "Aktion abgeschlossen",
    "Opération terminée",
    "Operación completada",
  ],
  uncertain: [
    "Outcome uncertain; check the provider before repeating.",
    "Ergebnis unklar; vor erneutem Ausführen beim Anbieter prüfen.",
    "Résultat incertain ; vérifiez avant de répéter.",
    "Resultado incierto; comprueba antes de repetir.",
  ],
  failed: [
    "Operation failed; verify connection and input.",
    "Aktion fehlgeschlagen; Verbindung und Eingaben prüfen.",
    "Échec ; vérifiez la connexion et les données.",
    "Error; comprueba conexión y datos.",
  ],
  applicationId: [
    "Application ID",
    "Anwendungs-ID",
    "ID de l’application",
    "ID de aplicación",
  ],
  index: [
    "Search index",
    "Suchindex",
    "Index de recherche",
    "Índice de búsqueda",
  ],
  space: [
    "Content space",
    "Inhaltsbereich",
    "Espace de contenu",
    "Espacio de contenido",
  ],
  environment: [
    "Content environment",
    "Inhaltsumgebung",
    "Environnement de contenu",
    "Entorno de contenido",
  ],
  locale: [
    "Content locale (for example de-DE)",
    "Inhaltssprache (z. B. de-DE)",
    "Langue du contenu (p. ex. fr-FR)",
    "Idioma del contenido (p. ej. es-ES)",
  ],
  region: [
    "Region (global / eu)",
    "Region (global / eu)",
    "Région (global / eu)",
    "Región (global / eu)",
  ],
  email: [
    "Contact email",
    "Kontakt-E-Mail",
    "E-mail du contact",
    "Correo del contacto",
  ],
  firstName: ["First name", "Vorname", "Prénom", "Nombre"],
  lastName: ["Last name", "Nachname", "Nom", "Apellidos"],
  metric: [
    "Event name",
    "Ereignisname",
    "Nom de l’événement",
    "Nombre del evento",
  ],
  eventId: [
    "Stable event ID",
    "Stabile Ereignis-ID",
    "ID stable de l’événement",
    "ID estable del evento",
  ],
  offset: [
    "Continue at content offset",
    "Bei Inhaltsposition fortsetzen",
    "Reprendre à la position",
    "Continuar desde la posición",
  ],
} as const;
export type IntegrationKey = keyof typeof integrationWords;
export function useIntegrationText() {
  const { locale } = useLocale();
  const index = locale.startsWith("de")
    ? 1
    : locale.startsWith("fr")
      ? 2
      : locale.startsWith("es")
        ? 3
        : 0;
  return (key: IntegrationKey) => integrationWords[key][index];
}

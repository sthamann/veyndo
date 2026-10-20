/** Service catalogue capability boundaries in all supported Studio languages. */
import { useLocale } from "../../shared/i18n/i18n";
const words = {
  title: [
    "Services & shop imports",
    "Dienste & Shop-Importe",
    "Services et imports",
    "Servicios e importaciones",
  ],
  intro: [
    "Ten selected integration routes. Connections require provider configuration; a listed route does not mean it is connected.",
    "Zehn ausgewählte Anbindungen. Verbindungen brauchen eine Anbieterkonfiguration; ein Eintrag bedeutet noch keine aktive Verbindung.",
    "Dix intégrations choisies. Chaque connexion nécessite sa configuration ; une entrée ne signifie pas qu’elle est connectée.",
    "Diez integraciones elegidas. Cada conexión requiere configuración; aparecer aquí no significa estar conectado.",
  ],
  frontend: [
    "Headless frontend and explicit deployment requests",
    "Headless-Frontend und gezielte Bereitstellungsanfragen",
    "Frontend et demandes de déploiement",
    "Frontend y solicitudes de despliegue",
  ],
  http: [
    "Documented HTTP action; Nexus Early Access. No native Nexus marketplace node.",
    "Dokumentierte HTTP-Aktion; Nexus Early Access. Kein nativer Nexus-Marktplatzbaustein.",
    "Action HTTP documentée ; Nexus Early Access. Aucun module marketplace natif.",
    "Acción HTTP documentada; Nexus Early Access. Sin módulo nativo del marketplace.",
  ],
  products: [
    "Product intake into a private Veyndo preview; other domains require an export profile.",
    "Produktimport in eine private Veyndo-Vorschau; weitere Bereiche benötigen ein Exportprofil.",
    "Import de produits en aperçu privé ; les autres domaines exigent un export.",
    "Productos en vista privada; otros dominios requieren un perfil de exportación.",
  ],
  import: [
    "Existing migration route into Veyndo, with review before import",
    "Vorhandener Migrationsweg nach Veyndo mit Prüfung vor dem Import",
    "Migration vers Veyndo avec vérification avant import",
    "Migración hacia Veyndo con revisión antes de importar",
  ],
  events: [
    "Explicit events; no automatic marketing subscription",
    "Gezielte Ereignisse; keine automatische Marketing-Anmeldung",
    "Événements explicites ; aucun abonnement automatique",
    "Eventos explícitos; sin suscripción automática",
  ],
  contacts: [
    "Explicit contact upsert with protected data access",
    "Gezielter Kontaktabgleich mit geschütztem Datenzugriff",
    "Contacts explicites avec accès protégé",
    "Contactos explícitos con acceso protegido",
  ],
  notifications: [
    "Existing notification app and Flow actions",
    "Vorhandene Benachrichtigungs-App und Flow-Aktionen",
    "App de notifications et actions Flow existantes",
    "App de notificaciones y acciones Flow existentes",
  ],
  knowledge: [
    "Published content into private shop knowledge",
    "Veröffentlichte Inhalte ins private Shopwissen",
    "Contenu publié vers les connaissances privées",
    "Contenido publicado al conocimiento privado",
  ],
  search: [
    "Bounded catalogue projection; native checkout stays authoritative",
    "Begrenzte Katalogprojektion; der native Checkout bleibt verbindlich",
    "Projection catalogue limitée ; paiement natif conservé",
    "Catálogo limitado; compra nativa conservada",
  ],
  open: ["Open app", "App öffnen", "Ouvrir l’app", "Abrir app"],
  setup: ["Set up app", "App einrichten", "Configurer l’app", "Configurar app"],
  guide: [
    "Open setup guide",
    "Einrichtung ansehen",
    "Guide de configuration",
    "Guía de configuración",
  ],
} as const;
export function useIntegrationDirectoryText() {
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

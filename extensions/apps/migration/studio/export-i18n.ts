/** Frozen export controls distinguish immutable artifact evidence from unproved whole-shop cutover. */
import { useLocale } from "../../../../frontend/src/shared/i18n/i18n";
const words = {
  public: [
    "Public export: send no credentials",
    "Öffentlicher Export: keine Zugangsdaten senden",
    "Export public : aucun identifiant transmis",
    "Export público: no enviar credenciales",
  ],
  publicHint: [
    "Enable only for an intentionally public source, such as the synthetic example. Protected exports use a separate read credential. HTTPS and checksum checks always apply.",
    "Nur für bewusst öffentliche Quellen aktivieren, etwa das synthetische Beispiel. Geschützte Exporte nutzen einen eigenen Lesezugang. HTTPS und Prüfsummen werden immer geprüft.",
    "Activez uniquement pour une source délibérément publique, comme l’exemple synthétique. Les exports protégés utilisent un accès distinct. HTTPS et sommes de contrôle restent vérifiés.",
    "Activa solo para una fuente deliberadamente pública, como el ejemplo sintético. Los exports protegidos usan acceso propio. Siempre se comprueban HTTPS y las sumas.",
  ],
  mode: [
    "Read a frozen source export",
    "Eingefrorenen Quellexport lesen",
    "Lire un export source figé",
    "Leer una exportación congelada",
  ],
  url: [
    "Export manifest URL",
    "Adresse des Export-Manifests",
    "URL du manifeste d’export",
    "URL del manifiesto",
  ],
  hash: [
    "Export manifest SHA-256",
    "SHA-256 des Export-Manifests",
    "SHA-256 du manifeste",
    "SHA-256 del manifiesto",
  ],
  credential: [
    "Export read credential",
    "Lesezugang zum Export",
    "Identifiant de lecture de l’export",
    "Credencial de lectura del export",
  ],
  hint: [
    "Use the original source identity above. The export has its own read credential; the source API credential is never forwarded to the export host.",
    "Oben bleibt die ursprüngliche Shop-Adresse stehen. Der Export hat einen eigenen Lesezugang; der API-Zugang des Shops wird niemals an den Export-Host weitergegeben.",
    "Conservez l’identité d’origine ci-dessus. L’export utilise un accès distinct ; l’identifiant API n’est jamais transmis à son hébergeur.",
    "Conserva la identidad original arriba. El export usa una credencial propia; la credencial API nunca se envía a su servidor.",
  ],
  title: [
    "Frozen source export",
    "Eingefrorener Quellexport",
    "Export source figé",
    "Exportación de origen congelada",
  ],
  counts: [
    "{source} source records · {normalized} normalized records · {pages} pages",
    "{source} Quelldatensätze · {normalized} normalisierte Datensätze · {pages} Seiten",
    "{source} données source · {normalized} données normalisées · {pages} pages",
    "{source} registros de origen · {normalized} normalizados · {pages} páginas",
  ],
  notice: [
    "The checksum freezes this domain export. It does not establish a consistent whole-shop snapshot or final cutover.",
    "Die Prüfsumme fixiert diesen Datenbereich. Sie belegt noch keinen konsistenten Gesamtabzug des Shops und keine abgeschlossene Umstellung.",
    "La somme de contrôle fige cet export. Elle ne prouve pas la cohérence de toute la boutique ni la bascule finale.",
    "La suma fija este export. No demuestra una instantánea coherente de toda la tienda ni el cambio final.",
  ],
} as const;
export function useExportText() {
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

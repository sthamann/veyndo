/** Native preview controls distinguish current rendering from saved API test evidence. */
import { useLocale } from "../../shared/i18n/i18n";
const words = {
  title: [
    "Shop preview for this test",
    "Shopvorschau zu diesem Test",
    "Aperçu de la boutique pour ce test",
    "Vista de la tienda para esta prueba",
  ],
  hint: [
    "Inspect the current sandbox in this customer’s channel and language. The saved test records API results; this preview is not a recording of that test.",
    "Prüfe die aktuelle Sandbox im Verkaufskanal und in der Sprache dieses Kunden. Der gespeicherte Test enthält API-Ergebnisse; diese Vorschau ist keine Aufzeichnung des Tests.",
    "Inspectez l’espace privé actuel avec le canal et la langue de ce client. Le test enregistré contient des résultats API ; cet aperçu n’est pas un enregistrement du test.",
    "Revisa el entorno privado actual con el canal y el idioma de este cliente. La prueba guardada contiene resultados de API; esta vista no es una grabación de la prueba.",
  ],
  profile: [
    "Customer profile",
    "Kundenprofil",
    "Profil client",
    "Perfil del cliente",
  ],
  open: ["Preview shop", "Shop ansehen", "Voir la boutique", "Ver tienda"],
  reload: [
    "Recheck and reload",
    "Erneut prüfen und laden",
    "Revérifier et recharger",
    "Comprobar y recargar",
  ],
  close: [
    "Close preview",
    "Vorschau schließen",
    "Fermer l’aperçu",
    "Cerrar vista",
  ],
  loading: [
    "Checking the saved test against the current shop…",
    "Gespeicherter Test wird mit dem aktuellen Shop verglichen …",
    "Comparaison du test enregistré avec la boutique actuelle…",
    "Comparando la prueba guardada con la tienda actual…",
  ],
  error: [
    "The test could not be checked. Try again to open the preview.",
    "Der Test konnte nicht geprüft werden. Versuche erneut, die Vorschau zu öffnen.",
    "Impossible de vérifier le test. Réessayez d’ouvrir l’aperçu.",
    "No se pudo comprobar la prueba. Vuelve a abrir la vista.",
  ],
  device: ["Viewport", "Ansicht", "Affichage", "Vista"],
  desktop: ["Desktop", "Desktop", "Ordinateur", "Escritorio"],
  mobile: ["Mobile", "Mobil", "Mobile", "Móvil"],
  separate: [
    "Open in new tab",
    "In neuem Tab öffnen",
    "Ouvrir dans un nouvel onglet",
    "Abrir en otra pestaña",
  ],
  help: [
    "If the shop cannot load here, open it in a new tab. Changes made elsewhere require a new check. Country, currency and customer account are set in the shop itself.",
    "Falls der Shop hier nicht lädt, öffne ihn in einem neuen Tab. Änderungen an anderer Stelle erfordern eine erneute Prüfung. Land, Währung und Kundenkonto wählst du im Shop selbst.",
    "Si la boutique ne se charge pas ici, ouvrez-la dans un nouvel onglet. Les modifications ailleurs nécessitent une nouvelle vérification. Le pays, la devise et le compte client se règlent dans la boutique.",
    "Si la tienda no carga aquí, ábrela en otra pestaña. Los cambios externos requieren otra comprobación. El país, la moneda y la cuenta se configuran en la tienda.",
  ],
} as const;
export function useReleasePreviewText() {
  const { locale } = useLocale();
  const index = { "en-GB": 0, "de-DE": 1, "fr-FR": 2, "es-ES": 3 }[locale];
  return (key: keyof typeof words) => words[key][index];
}

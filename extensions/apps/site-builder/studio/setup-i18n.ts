/** Guided private-editing vocabulary; package consent and publication keep their native owners. */
import { useLocale } from "../../../../frontend/src/shared/i18n/i18n";
const words = {
  title: [
    "Make this shop yours",
    "Mach diesen Shop zu deinem",
    "Personnalisez cette boutique",
    "Haz tuya esta tienda",
  ],
  hint: [
    "Your shop stays visible. Prepare a private workspace, review the editing tools, then continue where you clicked.",
    "Dein Shop bleibt sichtbar. Bereite einen privaten Arbeitsbereich vor, prüfe die Werkzeuge und arbeite dort weiter, wo du geklickt hast.",
    "Gardez la boutique visible. Préparez un espace privé, vérifiez les outils, puis reprenez votre sélection.",
    "La tienda sigue visible. Prepara un espacio privado, revisa las herramientas y continúa en tu selección.",
  ],
  private: [
    "Private workspace",
    "Privater Arbeitsbereich",
    "Espace privé",
    "Espacio privado",
  ],
  tools: [
    "Review editing tools",
    "Bearbeitungswerkzeuge prüfen",
    "Vérifier les outils",
    "Revisar herramientas",
  ],
  continue: [
    "Continue your design",
    "Gestaltung fortsetzen",
    "Reprendre le design",
    "Continuar el diseño",
  ],
  create: [
    "Create private draft and continue",
    "Privaten Entwurf erstellen und weiter",
    "Créer un brouillon privé et continuer",
    "Crear borrador privado y continuar",
  ],
  new: [
    "Create a new private workspace",
    "Neuen privaten Arbeitsbereich erstellen",
    "Créer un nouvel espace privé",
    "Crear un espacio privado nuevo",
  ],
  open: [
    "Open selected sandbox",
    "Gewählte Sandbox öffnen",
    "Ouvrir la sandbox sélectionnée",
    "Abrir sandbox seleccionada",
  ],
  review: [
    "Review required apps",
    "Benötigte Apps prüfen",
    "Vérifier les apps nécessaires",
    "Revisar apps necesarias",
  ],
  safe: [
    "Customers keep seeing the live shop. Saving a draft never publishes it.",
    "Kunden sehen weiter den Live-Shop. Das Speichern eines Entwurfs veröffentlicht ihn nicht.",
    "Les clients gardent la boutique en ligne. Enregistrer un brouillon ne le publie pas.",
    "Los clientes siguen viendo la tienda activa. Guardar un borrador no lo publica.",
  ],
  packageHint: [
    "Pages and appearance use Shop design. Forms use a separate private inbox. Approve each package's actual permissions before installation.",
    "Seiten und Aussehen nutzen Shop-Gestaltung. Formulare nutzen einen eigenen privaten Eingang. Prüfe vor der Installation die tatsächlichen Rechte jedes Pakets.",
    "Les pages utilisent Design de boutique, les formulaires une boîte privée. Vérifiez les droits de chaque app avant installation.",
    "Las páginas usan Diseño de tienda; los formularios, una bandeja privada. Revisa los permisos de cada app antes de instalarla.",
  ],
  channelDenied: [
    "Ask a shop administrator for channel editing access before changing this shop.",
    "Bitte einen Shop-Administrator um Bearbeitungsrechte für Verkaufskanäle, bevor du diesen Shop änderst.",
    "Demandez à un administrateur le droit de modifier les canaux avant de changer la boutique.",
    "Pide a un administrador permisos para editar canales antes de cambiar la tienda.",
  ],
  appDenied: [
    "Ask a shop administrator to approve the required editing apps. Your preview remains available.",
    "Bitte einen Shop-Administrator, die benötigten Gestaltungs-Apps freizugeben. Die Vorschau bleibt verfügbar.",
    "Demandez à un administrateur d’autoriser les apps. L’aperçu reste disponible.",
    "Pide a un administrador que apruebe las apps. La vista previa sigue disponible.",
  ],
  environmentDenied: [
    "Choose an existing private workspace or ask an administrator to create one.",
    "Wähle einen vorhandenen privaten Arbeitsbereich oder bitte einen Administrator, einen anzulegen.",
    "Choisissez un espace privé existant ou demandez à un administrateur d’en créer un.",
    "Elige un espacio privado existente o pide a un administrador que lo cree.",
  ],
  unavailable: [
    "Private editing is unavailable here. Open Staging & releases to select a workspace.",
    "Private Bearbeitung ist hier nicht verfügbar. Wähle einen Arbeitsbereich unter Staging & Veröffentlichungen.",
    "L’édition privée est indisponible ici. Sélectionnez un espace dans Staging et publications.",
    "La edición privada no está disponible aquí. Elige un espacio en Staging y publicaciones.",
  ],
  busy: [
    "Preparing your private workspace…",
    "Dein privater Arbeitsbereich wird vorbereitet …",
    "Préparation de votre espace privé…",
    "Preparando tu espacio privado…",
  ],
  done: ["Ready", "Bereit", "Prêt", "Listo"],
} as const;
export function useSetupText() {
  const { locale } = useLocale();
  const i =
    ({ en: 0, de: 1, fr: 2, es: 3 } as Record<string, number>)[
      locale.slice(0, 2)
    ] ?? 0;
  return (key: keyof typeof words) => words[key][i];
}

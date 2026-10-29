/** Host-owned composition controls never repeat model claims about completed commerce actions. */
import { useLocale } from "../../shared/i18n/i18n";
const words = {
  discardTitle: [
    "Leave unsaved changes?",
    "Ungespeicherte Änderungen verlassen?",
    "Quitter sans enregistrer ?",
    "¿Salir sin guardar?",
  ],
  discardBody: [
    "Your native editor still has unsaved changes. Return to save them or leave this draft.",
    "Im Editor gibt es noch ungespeicherte Änderungen. Kehre zum Speichern zurück oder verlasse diesen Entwurf.",
    "L’éditeur contient des modifications non enregistrées. Revenez pour les enregistrer ou quittez le brouillon.",
    "El editor tiene cambios sin guardar. Vuelve para guardarlos o abandona el borrador.",
  ],
  discard: [
    "Leave draft",
    "Entwurf verlassen",
    "Quitter le brouillon",
    "Abandonar borrador",
  ],
  title: [
    "Your working view",
    "Deine Arbeitsansicht",
    "Votre vue de travail",
    "Tu vista de trabajo",
  ],
  open: [
    "Open working view",
    "Arbeitsansicht öffnen",
    "Ouvrir la vue de travail",
    "Abrir vista de trabajo",
  ],
  current: [
    "Current shop data",
    "Aktuelle Shopdaten",
    "Données actuelles",
    "Datos actuales",
  ],
  records: ["List", "Liste", "Liste", "Lista"],
  details: [
    "Open details here",
    "Details hier öffnen",
    "Ouvrir les détails ici",
    "Abrir detalles aquí",
  ],
  intake: [
    "Add products",
    "Produkte hinzufügen",
    "Ajouter des produits",
    "Añadir productos",
  ],
  close: [
    "Close working view",
    "Arbeitsansicht schließen",
    "Fermer la vue",
    "Cerrar vista",
  ],
  pin: [
    "Pin this view",
    "Ansicht anheften",
    "Épingler cette vue",
    "Fijar esta vista",
  ],
  saved: [
    "Pinned to your workspace",
    "Im Arbeitsplatz angeheftet",
    "Épinglé à votre espace",
    "Fijada en tu espacio",
  ],
  privacy: [
    "Only layout and general filters are saved. Personal search terms stay in this session.",
    "Gespeichert werden die Anordnung und allgemeine Filter. Persönliche Suchbegriffe bleiben in dieser Sitzung.",
    "Seuls la disposition et les filtres généraux sont conservés. Les recherches personnelles restent dans cette session.",
    "Solo se guardan el diseño y filtros generales. Las búsquedas personales permanecen en esta sesión.",
  ],
  error: [
    "This view is unavailable with your current access. Refresh or return to the workspace.",
    "Diese Ansicht ist mit deinen aktuellen Rechten nicht verfügbar. Aktualisiere sie oder kehre zum Arbeitsplatz zurück.",
    "Cette vue est indisponible avec vos droits actuels. Actualisez ou revenez à votre espace.",
    "Esta vista no está disponible con tus permisos actuales. Actualiza o vuelve a tu espacio.",
  ],
  saveError: [
    "Could not pin the view. Refresh your workspace and try again.",
    "Die Ansicht konnte nicht angeheftet werden. Lade den Arbeitsplatz neu und versuche es erneut.",
    "Impossible d’épingler la vue. Actualisez votre espace et réessayez.",
    "No se pudo fijar la vista. Actualiza tu espacio e inténtalo de nuevo.",
  ],
  loading: [
    "Loading current access…",
    "Aktuelle Rechte werden geladen…",
    "Chargement des droits…",
    "Cargando permisos…",
  ],
} as const;
export function useCompositionText() {
  const { locale } = useLocale();
  const index =
    ({ en: 0, de: 1, fr: 2, es: 3 } as Record<string, number>)[
      locale.slice(0, 2)
    ] ?? 0;
  return (key: keyof typeof words) => words[key][index];
}

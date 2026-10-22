/** Preparation vocabulary describes persisted native progress, never an invented publication approval. */
import { useLocale } from "../../shared/i18n/i18n";
const words = {
  title: [
    "Prepare catalogue",
    "Katalog vorbereiten",
    "Préparer le catalogue",
    "Preparar catálogo",
  ],
  hint: [
    "Saved products, explicit translations and the latest image job. Open a step to finish it; publication is reviewed separately.",
    "Gespeicherte Produkte, eigene Übersetzungen und der letzte Bilderauftrag. Öffne einen Schritt zum Fertigstellen; die Veröffentlichung prüfst du separat.",
    "Produits enregistrés, traductions explicites et dernière tâche image. Ouvrez une étape ; la publication se vérifie séparément.",
    "Productos guardados, traducciones explícitas y última tarea de imagen. Abre un paso para terminarlo; la publicación se revisa aparte.",
  ],
  product: ["Product", "Produkt", "Produit", "Producto"],
  saved: ["Saved", "Gespeichert", "Enregistré", "Guardado"],
  texts: [
    "Texts & translations",
    "Texte & Übersetzungen",
    "Textes et traductions",
    "Textos y traducciones",
  ],
  images: ["Images", "Bilder", "Images", "Imágenes"],
  review: ["Visibility", "Sichtbarkeit", "Visibilité", "Visibilidad"],
  active: [
    "Active in this environment",
    "In dieser Umgebung aktiv",
    "Actif dans cet environnement",
    "Activo en este entorno",
  ],
  inactive: ["Inactive", "Inaktiv", "Inactif", "Inactivo"],
  missing: ["Add image", "Bild ergänzen", "Ajouter une image", "Añadir imagen"],
  queued: [
    "Image queued",
    "Bilderauftrag wartet",
    "Image en attente",
    "Imagen en cola",
  ],
  processing: [
    "Image being generated",
    "Bild wird erzeugt",
    "Image en génération",
    "Generando imagen",
  ],
  ready: [
    "Review image draft",
    "Bildentwurf prüfen",
    "Vérifier l’image",
    "Revisar borrador",
  ],
  failed: [
    "Image failed · open to retry",
    "Bild fehlgeschlagen · zum Wiederholen öffnen",
    "Image échouée · ouvrir pour réessayer",
    "Imagen fallida · abrir para reintentar",
  ],
  applied: [
    "Image applied",
    "Bild übernommen",
    "Image appliquée",
    "Imagen aplicada",
  ],
  present: [
    "Image saved",
    "Bild gespeichert",
    "Image enregistrée",
    "Imagen guardada",
  ],
  loading: [
    "Loading progress",
    "Fortschritt wird geladen",
    "Chargement",
    "Cargando progreso",
  ],
  unknown: [
    "Progress unavailable",
    "Fortschritt nicht verfügbar",
    "Progrès indisponible",
    "Progreso no disponible",
  ],
  translationHint: [
    "Explicit names / descriptions per enabled language. Missing translations may inherit the shop’s main language.",
    "Eigene Namen / Beschreibungen je aktivierter Sprache. Fehlende Übersetzungen können aus der Hauptsprache erben.",
    "Noms / descriptions explicites par langue activée. Les traductions absentes peuvent hériter de la langue principale.",
    "Nombres / descripciones explícitos por idioma activo. Los ausentes pueden heredar el idioma principal.",
  ],
  translations: [
    "Manage translation jobs",
    "Übersetzungsaufträge verwalten",
    "Gérer les traductions",
    "Gestionar traducciones",
  ],
  publication: [
    "Review selected publication",
    "Ausgewählte Veröffentlichung prüfen",
    "Vérifier la publication choisie",
    "Revisar publicación seleccionada",
  ],
} as const;
export type PreparationWord = keyof typeof words;
export function usePreparationText() {
  const { locale } = useLocale();
  return (key: PreparationWord) =>
    words[key][{ "en-GB": 0, "de-DE": 1, "fr-FR": 2, "es-ES": 3 }[locale]];
}

/** Design comparison vocabulary keeps automated structural counts distinct from visual and functional acceptance. */
import { useLocale } from "../../../../frontend/src/shared/i18n/i18n";
const words = {
  title: [
    "What actually changes",
    "Was sich tatsächlich ändert",
    "Ce qui change réellement",
    "Qué cambia realmente",
  ],
  inserted: [
    "Elements added",
    "Neue Elemente",
    "Éléments ajoutés",
    "Elementos añadidos",
  ],
  removed: [
    "Elements removed",
    "Entfernte Elemente",
    "Éléments supprimés",
    "Elementos eliminados",
  ],
  moved: [
    "Elements repositioned",
    "Neu positionierte Elemente",
    "Éléments déplacés",
    "Elementos reposicionados",
  ],
  theme: [
    "Design properties changed",
    "Geänderte Design-Eigenschaften",
    "Propriétés visuelles modifiées",
    "Propiedades de diseño cambiadas",
  ],
  forms: [
    "Forms in proposal",
    "Formulare im Vorschlag",
    "Formulaires proposés",
    "Formularios propuestos",
  ],
  apps: [
    "App elements in proposal",
    "App-Elemente im Vorschlag",
    "Éléments d’app proposés",
    "Elementos de app propuestos",
  ],
  hint: [
    "Compare both screen sizes and test links, forms and app elements in the sandbox. Counts describe structure; they do not certify layout, accessibility or business behavior. Applying keeps the change private until you publish.",
    "Vergleiche beide Bildschirmgrößen und teste Links, Formulare und App-Elemente in der Sandbox. Die Zahlen beschreiben die Struktur; sie bestätigen weder Darstellung noch Barrierefreiheit oder Geschäftsverhalten. Übernehmen bleibt bis zur Veröffentlichung privat.",
    "Comparez les deux tailles et testez liens, formulaires et apps dans le bac à sable. Les nombres décrivent la structure, pas la qualité visuelle, l’accessibilité ou le comportement. L’application reste privée jusqu’à publication.",
    "Compara ambos tamaños y prueba enlaces, formularios y apps en el entorno privado. Las cifras describen estructura, no certifican diseño, accesibilidad ni comportamiento. Aplicar permanece privado hasta publicar.",
  ],
  desktop: [
    "Preview desktop",
    "Desktop-Vorschau",
    "Aperçu ordinateur",
    "Vista de escritorio",
  ],
  mobile: ["Preview mobile", "Mobil-Vorschau", "Aperçu mobile", "Vista móvil"],
} as const;
export function useReviewText() {
  const { locale } = useLocale();
  return (key: keyof typeof words) =>
    words[key][{ "en-GB": 0, "de-DE": 1, "fr-FR": 2, "es-ES": 3 }[locale]];
}

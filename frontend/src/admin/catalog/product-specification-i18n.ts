/** Four-language specification guidance, safe key editing and explicit draft-row actions. */
import { useLocale } from "../../shared/i18n/i18n";
const words = {
  visible: [
    "Product details",
    "Sichtbare Produktangaben",
    "Détails du produit",
    "Detalles del producto",
  ],
  visibleHint: [
    "These details appear on the product page in the selected content language.",
    "Diese Angaben erscheinen auf der Produktseite in der gewählten Inhaltssprache.",
    "Ces détails apparaissent sur la fiche produit dans la langue sélectionnée.",
    "Estos detalles aparecen en la página del producto en el idioma seleccionado.",
  ],
  inheritance: [
    "Missing details inherit from the main language. Removing an own detail restores its inherited value.",
    "Fehlende Angaben werden aus der Hauptsprache übernommen. Entfernst du eine eigene Angabe, erscheint wieder ihr geerbter Wert.",
    "Les détails absents proviennent de la langue principale. Supprimer un détail propre rétablit sa valeur héritée.",
    "Los detalles ausentes se heredan del idioma principal. Al eliminar un detalle propio se restaura su valor heredado.",
  ],
  properties: [
    "Technical properties",
    "Technische Eigenschaften",
    "Propriétés techniques",
    "Propiedades técnicas",
  ],
  propertiesHint: [
    "Shared across languages and also shown on the product page. Use stable names for catalogue properties and app or automation data.",
    "Gelten für alle Sprachen und erscheinen ebenfalls auf der Produktseite. Verwende eindeutige Namen für Katalogeigenschaften und Daten für Apps oder Automatisierung.",
    "Communes à toutes les langues et aussi affichées sur la fiche produit. Utilisez des noms stables pour les propriétés du catalogue et les données des apps ou automatisations.",
    "Comunes a todos los idiomas y también visibles en la página del producto. Usa nombres estables para propiedades del catálogo y datos de apps o automatizaciones.",
  ],
  dimensions: [
    "Weight and dimensions",
    "Gewicht und Maße",
    "Poids et dimensions",
    "Peso y dimensiones",
  ],
  dimensionsHint: [
    "Weight in kilograms, dimensions in millimetres. Empty fields remain unset.",
    "Gewicht in Kilogramm, Maße in Millimetern. Leere Felder bleiben ungesetzt.",
    "Poids en kilogrammes, dimensions en millimètres. Les champs vides restent non définis.",
    "Peso en kilogramos, dimensiones en milímetros. Los campos vacíos quedan sin definir.",
  ],
  preview: [
    "Product-page preview",
    "Vorschau der Produktangaben",
    "Aperçu des détails du produit",
    "Vista previa de los detalles",
  ],
  empty: [
    "No details yet. Add a name and a value below.",
    "Noch keine Angaben. Ergänze unten einen Namen und einen Wert.",
    "Aucun détail. Ajoutez un nom et une valeur ci-dessous.",
    "Aún no hay detalles. Añade un nombre y un valor abajo.",
  ],
  newKey: ["New name", "Neuer Name", "Nouveau nom", "Nuevo nombre"],
  newValue: ["New value", "Neuer Wert", "Nouvelle valeur", "Nuevo valor"],
  add: [
    "Add detail",
    "Angabe hinzufügen",
    "Ajouter un détail",
    "Añadir detalle",
  ],
  addHint: [
    "Add this row before saving the product. Renamed fields apply when you leave the name field.",
    "Füge die Zeile vor dem Speichern des Produkts hinzu. Ein geänderter Name wird beim Verlassen des Feldes übernommen.",
    "Ajoutez cette ligne avant d’enregistrer le produit. Un nom modifié est appliqué en quittant son champ.",
    "Añade esta fila antes de guardar el producto. Los nombres modificados se aplican al salir del campo.",
  ],
  duplicate: [
    "This name already exists. Both existing values were kept.",
    "Dieser Name ist bereits vorhanden. Beide bisherigen Werte bleiben erhalten.",
    "Ce nom existe déjà. Les deux valeurs existantes ont été conservées.",
    "Este nombre ya existe. Se han conservado ambos valores originales.",
  ],
  invalid: [
    "Enter a unique name of at most 100 bytes. Values may contain up to 1,000 bytes.",
    "Verwende einen eindeutigen Namen mit höchstens 100 Bytes. Werte dürfen bis zu 1.000 Bytes enthalten.",
    "Saisissez un nom unique de 100 octets maximum. Les valeurs acceptent jusqu’à 1 000 octets.",
    "Usa un nombre único de hasta 100 bytes. Los valores admiten hasta 1.000 bytes.",
  ],
  limit: [
    "The maximum of 40 details has been reached.",
    "Die Höchstzahl von 40 Angaben ist erreicht.",
    "Le maximum de 40 détails est atteint.",
    "Se ha alcanzado el máximo de 40 detalles.",
  ],
} as const;
export function useProductSpecificationText() {
  const { locale } = useLocale();
  return (key: keyof typeof words) =>
    words[key][{ "en-GB": 0, "de-DE": 1, "fr-FR": 2, "es-ES": 3 }[locale]];
}

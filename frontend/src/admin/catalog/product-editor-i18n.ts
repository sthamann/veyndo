/** Product workspace guidance shares the interface locale, never the product's content language. */
import { useLocale } from "../../shared/i18n/i18n";
const words = {
  back: [
    "Back to products",
    "Zurück zu Produkten",
    "Retour aux produits",
    "Volver a los productos",
  ],
  information: [
    "Product information",
    "Produktinformationen",
    "Informations produit",
    "Información del producto",
  ],
  selling: [
    "Sales & availability",
    "Verkauf & Verfügbarkeit",
    "Vente et disponibilité",
    "Venta y disponibilidad",
  ],
  content: [
    "Content & trust",
    "Inhalte & Vertrauen",
    "Contenu et confiance",
    "Contenido y confianza",
  ],
  extensions: [
    "App extensions",
    "App Erweiterungen",
    "Extensions d’apps",
    "Extensiones de apps",
  ],
  section: [
    "Product section",
    "Produktbereich",
    "Rubrique du produit",
    "Sección del producto",
  ],
  version: [
    "Version {revision}",
    "Version {revision}",
    "Version {revision}",
    "Versión {revision}",
  ],
  general: [
    "Name, description and product identity.",
    "Name, Beschreibung und Produktkennzeichen.",
    "Nom, description et identification du produit.",
    "Nombre, descripción e identificación del producto.",
  ],
  prices: [
    "Prices, taxes, stock and purchasing quantities.",
    "Preise, Steuern, Bestand und Bestellmengen.",
    "Prix, taxes, stock et quantités d’achat.",
    "Precios, impuestos, existencias y cantidades de compra.",
  ],
  media: [
    "Choose the images and videos customers see.",
    "Bilder und Videos für deine Kunden auswählen.",
    "Choisissez les images et vidéos présentées aux clients.",
    "Elige las imágenes y los vídeos que ven tus clientes.",
  ],
  variants: [
    "Organize sizes, colors and other product options.",
    "Größen, Farben und weitere Produktausführungen verwalten.",
    "Gérez les tailles, couleurs et autres options du produit.",
    "Organiza tallas, colores y otras opciones del producto.",
  ],
  assignments: [
    "Choose categories and the channels that sell this product.",
    "Kategorien und Verkaufskanäle für dieses Produkt festlegen.",
    "Choisissez les catégories et les canaux de vente de ce produit.",
    "Elige las categorías y los canales de venta del producto.",
  ],
  specs: [
    "Add specifications, properties and dimensions.",
    "Technische Angaben, Eigenschaften und Maße ergänzen.",
    "Ajoutez les caractéristiques, propriétés et dimensions.",
    "Añade especificaciones, propiedades y dimensiones.",
  ],
  seo: [
    "Control how this product appears in search results.",
    "Darstellung dieses Produkts in Suchergebnissen bearbeiten.",
    "Personnalisez la présentation du produit dans les résultats de recherche.",
    "Personaliza cómo aparece el producto en los resultados de búsqueda.",
  ],
  related: [
    "Connect suitable accessories and complementary products.",
    "Passendes Zubehör und ergänzende Produkte verbinden.",
    "Associez des accessoires et des produits complémentaires.",
    "Vincula accesorios y productos complementarios.",
  ],
  attachments: [
    "Manage product documents and purchased downloads.",
    "Produktdokumente und gekaufte Downloads verwalten.",
    "Gérez les documents du produit et les téléchargements achetés.",
    "Gestiona documentos y descargas adquiridas.",
  ],
  reviews: [
    "Review customer feedback and decide what is published.",
    "Kundenbewertungen prüfen und zur Veröffentlichung freigeben.",
    "Examinez les avis des clients et choisissez ceux à publier.",
    "Revisa las opiniones y decide cuáles se publican.",
  ],
  compliance: [
    "Maintain safety information and required product details.",
    "Sicherheitsinformationen und erforderliche Produktangaben pflegen.",
    "Gérez les informations de sécurité et les détails obligatoires.",
    "Mantén la información de seguridad y los datos obligatorios.",
  ],
  noReviews: [
    "No reviews for this product yet",
    "Noch keine Bewertungen für dieses Produkt",
    "Aucun avis pour ce produit pour le moment",
    "Este producto aún no tiene opiniones",
  ],
  reviewEmpty: [
    "Customer reviews will appear here for you to review and publish.",
    "Neue Kundenbewertungen erscheinen hier. Du kannst sie prüfen und veröffentlichen.",
    "Les avis des clients apparaîtront ici pour examen et publication.",
    "Las opiniones aparecerán aquí para que las revises y publiques.",
  ],
} as const;
export type ProductEditorWord = keyof typeof words;
export function useProductEditorText() {
  const { locale } = useLocale();
  const index =
    locale === "de-DE"
      ? 1
      : locale === "fr-FR"
        ? 2
        : locale === "es-ES"
          ? 3
          : 0;
  return (key: ProductEditorWord) => words[key][index];
}

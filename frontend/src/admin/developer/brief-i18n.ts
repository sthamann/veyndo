/** Typed merchant vocabulary for description-led app creation; no extra agent or execution path. */
import { useLocale } from "../../shared/i18n/i18n";
const en = {
  title: "Describe the app you need",
  intro:
    "Tell the designer how you work. The AI prepares an editable app for you to review and try privately.",
  name: "App name",
  brief: "What should your app do?",
  hint: "Describe the information to collect, who uses it and what happens next. Keep passwords and customer data out of this description.",
  placeholder:
    "We need product consultation requests with a design upload, a review status and a private team overview.",
  example: "Try a consultation app",
  exampleName: "Consultation requests",
  exampleBrief:
    "Create a private consultation workspace for our team. Each request links to an existing product and has a title, details, an optional design file and a status: new, reviewed or closed. Add a product-tab form and a private administration overview with a list, record editor and working save buttons. Add a required text setting for the responsible team name. Keep all request data private. Use our enabled shop languages.",
  prepare: "Prepare with AI",
  next: "Next: review the AI proposal, open the private preview and test it before publication.",
};
type Key = keyof typeof en;
const words: Record<string, Record<Key, string>> = {
  "en-GB": en,
  "de-DE": {
    title: "Beschreibe die App, die du brauchst",
    intro:
      "Erkläre, wie du arbeiten möchtest. Die KI bereitet eine bearbeitbare App vor, die du prüfen und privat ausprobieren kannst.",
    name: "App-Name",
    brief: "Was soll deine App tun?",
    hint: "Beschreibe die benötigten Informationen, wer damit arbeitet und was danach passieren soll. Keine Passwörter oder Kundendaten eingeben.",
    placeholder:
      "Wir brauchen Produktberatungsanfragen mit einem Design-Upload, einem Prüfstatus und einer privaten Teamübersicht.",
    example: "Beratungs-App ausprobieren",
    exampleName: "Beratungsanfragen",
    exampleBrief:
      "Erstelle einen privaten Beratungsbereich für unser Team. Jede Anfrage gehört zu einem bestehenden Produkt und enthält Titel, Beschreibung, eine optionale Designdatei und den Status neu, geprüft oder abgeschlossen. Ergänze ein Formular im Produkt und eine private Verwaltungsübersicht mit Liste, Datensatzeditor und funktionierenden Speichern-Schaltflächen. Ergänze eine erforderliche Texteinstellung für den Namen des zuständigen Teams. Alle Anfragedaten bleiben privat. Verwende die aktivierten Shopsprachen.",
    prepare: "Mit KI vorbereiten",
    next: "Als Nächstes: KI-Vorschlag prüfen, private Vorschau öffnen und vor der Veröffentlichung ausprobieren.",
  },
  "fr-FR": {
    title: "Décrivez l’application dont vous avez besoin",
    intro:
      "Expliquez votre façon de travailler. L’IA prépare une application modifiable à examiner et à tester en privé.",
    name: "Nom de l’application",
    brief: "Que doit faire votre application ?",
    hint: "Décrivez les informations, les utilisateurs et les étapes suivantes. Ne saisissez aucun mot de passe ni donnée client.",
    placeholder:
      "Nous avons besoin de demandes de conseil produit avec un fichier de conception, un statut et une vue privée pour l’équipe.",
    example: "Essayer une application de conseil",
    exampleName: "Demandes de conseil",
    exampleBrief:
      "Créez un espace privé de conseil pour notre équipe. Chaque demande est liée à un produit existant et contient un titre, une description, un fichier de conception facultatif et un statut : nouveau, examiné ou terminé. Ajoutez un formulaire produit et une vue privée avec liste, éditeur et boutons d’enregistrement fonctionnels. Ajoutez un réglage texte obligatoire pour le nom de l’équipe responsable. Toutes les demandes restent privées. Utilisez les langues actives de la boutique.",
    prepare: "Préparer avec l’IA",
    next: "Ensuite : examinez la proposition, ouvrez l’aperçu privé et testez avant publication.",
  },
  "es-ES": {
    title: "Describe la aplicación que necesitas",
    intro:
      "Explica cómo trabajas. La IA prepara una aplicación editable para revisar y probar en privado.",
    name: "Nombre de la aplicación",
    brief: "¿Qué debe hacer tu aplicación?",
    hint: "Describe la información, quién la utiliza y los pasos siguientes. No introduzcas contraseñas ni datos de clientes.",
    placeholder:
      "Necesitamos consultas sobre productos con un archivo de diseño, un estado y una vista privada del equipo.",
    example: "Probar una aplicación de consultas",
    exampleName: "Solicitudes de consulta",
    exampleBrief:
      "Crea un espacio privado de consultas para nuestro equipo. Cada solicitud está vinculada a un producto existente y tiene título, descripción, archivo de diseño opcional y estado: nueva, revisada o cerrada. Añade un formulario de producto y una vista privada con lista, editor y botones de guardado funcionales. Añade un ajuste de texto obligatorio para el nombre del equipo responsable. Todos los datos permanecen privados. Utiliza los idiomas activos de la tienda.",
    prepare: "Preparar con IA",
    next: "Después: revisa la propuesta, abre la vista privada y prueba antes de publicar.",
  },
};
export function useAppBriefText() {
  const { locale } = useLocale();
  return (key: Key) => (words[locale] ?? en)[key];
}

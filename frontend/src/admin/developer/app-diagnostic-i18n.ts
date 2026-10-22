/** Actionable package review vocabulary distinguishes declarations, runtime checks and publication. */
import { useLocale } from "../../shared/i18n/i18n";
const words = {
  connections: [
    "Connections to finish",
    "Offene Verbindungen",
    "Connexions à terminer",
    "Conexiones pendientes",
  ],
  viewMissing: [
    "Placement points to a missing view",
    "Einbauort verweist auf eine fehlende Ansicht",
    "Vue d’emplacement absente",
    "Falta la vista de la ubicación",
  ],
  modelMissing: [
    "Block points to a missing data model",
    "Baustein verweist auf ein fehlendes Datenmodell",
    "Modèle du bloc absent",
    "Falta el modelo del bloque",
  ],
  actionMissing: [
    "Referenced action is not declared",
    "Verwendete Aktion ist nicht definiert",
    "Action référencée non déclarée",
    "Acción referenciada sin declarar",
  ],
  relationMissing: [
    "Related data model is missing",
    "Verknüpftes Datenmodell fehlt",
    "Modèle lié absent",
    "Falta el modelo relacionado",
  ],
  agentUnavailable: [
    "Agent tool is missing or not explicitly enabled",
    "Agenten-Tool fehlt oder ist nicht ausdrücklich freigegeben",
    "Outil agent absent ou non activé",
    "Herramienta de agente ausente o sin activar",
  ],
  examplesMissing: [
    "Add examples for commerce decisions",
    "Beispiele für Commerce-Entscheidungen ergänzen",
    "Ajouter des exemples de décisions commerce",
    "Añadir ejemplos de decisiones comerciales",
  ],
  connectionsClear: [
    "No broken references found in this draft. Test the installed version next.",
    "In diesem Entwurf wurden keine ungültigen Verweise gefunden. Teste als Nächstes die installierte Version.",
    "Aucune référence rompue trouvée. Testez ensuite la version installée.",
    "No se encontraron referencias rotas. Prueba ahora la versión instalada.",
  ],
  title: [
    "Before publishing",
    "Vor dem Veröffentlichen",
    "Avant publication",
    "Antes de publicar",
  ],
  hint: [
    "These are package declarations, not test results. Open an area to complete it, then test the installed app in your sandbox.",
    "Das sind Paketangaben, keine Testergebnisse. Öffne einen Bereich zum Bearbeiten und teste danach die installierte App in deiner Sandbox.",
    "Ce sont des déclarations du paquet, pas des résultats de test. Ouvrez un domaine puis testez l’app installée dans votre bac à sable.",
    "Son declaraciones del paquete, no resultados de pruebas. Abre una sección y prueba la app instalada en tu entorno privado.",
  ],
  surfaces: [
    "Views and placements",
    "Ansichten und Einbauorte",
    "Vues et emplacements",
    "Vistas y ubicaciones",
  ],
  settings: [
    "Required settings after installation",
    "Pflichteinstellungen nach Installation",
    "Paramètres requis après installation",
    "Ajustes requeridos tras instalar",
  ],
  models: [
    "Data models",
    "Datenmodelle",
    "Modèles de données",
    "Modelos de datos",
  ],
  actions: [
    "Explicit agent tools",
    "Explizite Agenten-Tools",
    "Outils d’agent explicites",
    "Herramientas de agente explícitas",
  ],
  examples: [
    "Declared business examples",
    "Deklarierte Geschäftsbeispiele",
    "Exemples métier déclarés",
    "Ejemplos comerciales declarados",
  ],
  sandbox: [
    "Install this saved version in a sandbox and run the real workflow, including errors and retries.",
    "Installiere diese gespeicherte Version in einer Sandbox und prüfe den echten Ablauf, auch Fehler und Wiederholungen.",
    "Installez cette version sauvegardée dans un bac à sable et testez le parcours, les erreurs et les répétitions.",
    "Instala esta versión guardada en un entorno privado y prueba el flujo, errores y reintentos.",
  ],
  rights: [
    "Try a restricted team member and a foreign shop. Check public views for unintended data.",
    "Prüfe ein eingeschränktes Teammitglied und einen fremden Shop. Kontrolliere öffentliche Ansichten auf unbeabsichtigte Daten.",
    "Testez un membre aux droits limités et une autre boutique. Vérifiez les données des vues publiques.",
    "Prueba con un miembro limitado y otra tienda. Revisa los datos de vistas públicas.",
  ],
  release: [
    "Review selected changes, publish deliberately, then test the live workflow and rollback.",
    "Prüfe ausgewählte Änderungen, veröffentliche bewusst und teste danach Live-Ablauf und Rücknahme.",
    "Vérifiez les changements sélectionnés, publiez puis testez le parcours en ligne et le retour arrière.",
    "Revisa los cambios seleccionados, publica y prueba el flujo publicado y la reversión.",
  ],
  assist: [
    "Prepare a test plan with the agent",
    "Mit dem Agenten einen Testplan vorbereiten",
    "Préparer un plan de test avec l’agent",
    "Preparar un plan de pruebas con el agente",
  ],
  prompt: [
    "Review this app’s actual package: views, required installation settings, data models, permissions and agent tools. Prepare concrete sandbox tests with positive, denied, retry and rollback cases. Distinguish declarations from observed execution and do not claim unrun tests passed.",
    "Prüfe das tatsächliche Paket dieser App: Ansichten, Pflichteinstellungen, Datenmodelle, Rechte und Agenten-Tools. Bereite konkrete Sandbox-Tests mit Erfolgs-, Ablehnungs-, Wiederholungs- und Rücknahmefällen vor. Trenne Angaben von beobachteter Ausführung; behaupte keine nicht ausgeführten Tests als bestanden.",
    "Examinez le paquet réel : vues, paramètres requis, modèles, droits et outils. Préparez des tests positifs, refusés, répétés et de retour arrière dans le bac à sable. Distinguez déclarations et exécution observée sans inventer de tests réussis.",
    "Revisa el paquete real: vistas, ajustes requeridos, modelos, permisos y herramientas. Prepara pruebas positivas, denegadas, repetidas y de reversión en el entorno privado. Distingue declaraciones de ejecución observada sin inventar pruebas aprobadas.",
  ],
} as const;
export function useAppDiagnosticText() {
  const { locale } = useLocale();
  return (key: keyof typeof words) =>
    words[key][{ "en-GB": 0, "de-DE": 1, "fr-FR": 2, "es-ES": 3 }[locale]];
}

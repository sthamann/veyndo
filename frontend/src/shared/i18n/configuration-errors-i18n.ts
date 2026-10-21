/** Actionable configuration recovery uses safe diagnostics; material input values and guest details are never displayed as errors. */
export const configurationErrors = {
  "Page translation language is not enabled for this shop": [
    "This page uses a language that is not enabled in the target shop. Include the reviewed language settings in the same publication, or adapt the page to an enabled language.",
    "Diese Seite verwendet eine Sprache, die im Zielshop nicht aktiviert ist. Wähle die geprüften Spracheinstellungen für dieselbe Veröffentlichung aus oder passe die Seite an eine aktivierte Sprache an.",
    "Cette page utilise une langue non activée dans la boutique cible. Incluez les paramètres de langue vérifiés dans la même publication ou adaptez la page à une langue activée.",
    "La página usa un idioma no activado en la tienda de destino. Incluye los ajustes de idioma revisados en la misma publicación o adapta la página a un idioma activado.",
  ],
  "Page channel does not belong to this shop": [
    "The page’s sales channel is not available in the target shop. Include that channel in the same publication or select an existing channel for the page.",
    "Der Verkaufskanal dieser Seite ist im Zielshop nicht verfügbar. Wähle ihn für dieselbe Veröffentlichung aus oder ordne die Seite einem vorhandenen Kanal zu.",
    "Le canal de vente de cette page n’est pas disponible dans la boutique cible. Incluez-le dans la même publication ou choisissez un canal existant.",
    "El canal de venta de la página no está disponible en la tienda de destino. Inclúyelo en la misma publicación o selecciona un canal existente.",
  ],
  "Source price currency is not configured": [
    "This configuration cannot be priced in the selected currency. The shop needs to configure its source currency and exchange rate.",
    "Diese Konfiguration kann in der ausgewählten Währung nicht berechnet werden. Der Shop muss die Preiswährung und ihren Wechselkurs einrichten.",
    "Cette configuration ne peut être chiffrée dans la devise choisie. La boutique doit configurer la devise source et son taux.",
    "No se puede calcular esta configuración en la moneda elegida. La tienda debe configurar la moneda de origen y su cambio.",
  ],
  "App price changed; configure again": [
    "The material or price rule changed. Open this product’s configuration again and review the updated price before ordering.",
    "Material oder Preisregel wurden geändert. Öffne die Produktkonfiguration erneut und prüfe den aktualisierten Preis vor der Bestellung.",
    "Le matériau ou la règle de prix a changé. Rouvrez la configuration et vérifiez le prix avant de commander.",
    "Cambió el material o la regla de precio. Abre la configuración y revisa el nuevo precio antes de pedir.",
  ],
  "App changed; configure again": [
    "The configurator was updated. Reopen the product configuration and review your choices.",
    "Der Konfigurator wurde aktualisiert. Öffne die Produktkonfiguration erneut und prüfe deine Auswahl.",
    "Le configurateur a été mis à jour. Rouvrez-le et vérifiez vos choix.",
    "El configurador se actualizó. Ábrelo de nuevo y revisa tu selección.",
  ],
  "App rejected configuration or exceeded platform money bound": [
    "The selected combination is unavailable. Review the material and dimensions or ask the shop for an individual quote.",
    "Diese Kombination ist nicht verfügbar. Prüfe Material und Maße oder frage den Shop nach einem individuellen Angebot.",
    "Cette combinaison est indisponible. Vérifiez matériau et dimensions ou demandez un devis.",
    "La combinación no está disponible. Revisa material y medidas o pide un presupuesto.",
  ],
} as const;

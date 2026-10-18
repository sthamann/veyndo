/** Catalogue intake diagnostics retain source-line metadata while all transport clients show actionable localized guidance. */
export const catalogIntakeErrors: Record<string, readonly string[]> = {
  "Supplier price currency differs from the Veyndo shop; upload explicitly converted prices instead": [
    "The supplier returned prices in a different currency. No products were created. Choose a supplier using your shop currency or upload an export with reviewed prices.",
    "Der Anbieter liefert Preise in einer anderen Währung. Es wurde nichts angelegt. Wähle einen Anbieter mit deiner Shop-Währung oder lade einen Export mit geprüften Preisen hoch.",
    "Le fournisseur renvoie une autre devise. Aucun produit créé. Choisissez un fournisseur dans la devise de la boutique ou importez des prix vérifiés.",
    "El proveedor devuelve otra moneda. No se crearon productos. Elige un proveedor en la moneda de tu tienda o carga precios revisados.",
  ],
  "Shop catalogue returned warnings; review directly with the supplier or upload an export": [
    "The catalogue reported restrictions. No products were created. Review them with the supplier or upload a verified export.",
    "Der Katalog meldet Einschränkungen. Es wurde nichts angelegt. Kläre sie mit dem Anbieter oder lade einen geprüften Export hoch.",
    "Le catalogue signale des restrictions. Aucun produit créé. Vérifiez-les avec le fournisseur ou importez un export contrôlé.",
    "El catálogo indica restricciones. No se crearon productos. Revísalas con el proveedor o carga una exportación verificada.",
  ],
  "No bounded Shop catalogue result": [
    "No usable products were returned. Narrow the query, choose a shop domain or upload a product export. No products were created.",
    "Es wurden keine verwendbaren Produkte geliefert. Grenze die Suche ein, wähle eine Shop-Domain oder lade einen Produktexport hoch. Es wurde nichts angelegt.",
    "Aucun produit utilisable. Précisez la recherche, choisissez un domaine ou importez un export. Aucun produit créé.",
    "No hay productos utilizables. Concreta la búsqueda, elige un dominio o carga un export. No se creó ningún producto.",
  ],
  "Shop catalogue is unavailable; retry explicitly or upload an export": [
    "The supplier catalogue is unavailable. Your drafts are unchanged. Retry later or upload a CSV.",
    "Der Anbieterkatalog ist nicht erreichbar. Deine Entwürfe bleiben erhalten. Versuche es später oder lade eine CSV hoch.",
    "Le catalogue est indisponible. Vos brouillons sont conservés. Réessayez ou importez un CSV.",
    "El catálogo no está disponible. Tus borradores se conservan. Reintenta o carga un CSV.",
  ],
  "Shopify export requires unique Handle, Title and Variant Price columns": [
    "Upload Shopify’s product export with one Handle, Title and Variant Price column. Duplicate or missing headers cannot be mapped safely.",
    "Lade den Shopify-Produktexport mit je einer Spalte Handle, Title und Variant Price hoch. Doppelte oder fehlende Überschriften lassen sich nicht sicher zuordnen.",
    "Importez l’export Shopify avec une colonne Handle, Title et Variant Price. Les en-têtes manquants ou doublés ne sont pas sûrs.",
    "Carga el export Shopify con una columna Handle, Title y Variant Price. Los encabezados repetidos o ausentes no se pueden asignar de forma segura.",
  ],
  "App destination resolves to a disallowed address": [
    "This address is blocked by the network policy. Use a public HTTPS product URL or a CSV.",
    "Diese Adresse ist durch die Netzwerkschutzregeln gesperrt. Verwende eine öffentliche HTTPS-Produkt-URL oder eine CSV.",
    "Cette adresse est bloquée par la politique réseau. Utilisez une URL HTTPS publique ou un CSV.",
    "La política de red bloquea esta dirección. Usa una URL HTTPS pública o CSV.",
  ],
  "App destination requires an approved HTTPS or private origin": [
    "Use a permitted HTTPS address without embedded credentials.",
    "Verwende eine zugelassene HTTPS-Adresse ohne eingebettete Zugangsdaten.",
    "Utilisez une adresse HTTPS autorisée sans identifiants intégrés.",
    "Usa una dirección HTTPS permitida sin credenciales integradas.",
  ],
  "Catalogue settings changed; prepare fresh drafts": [
    "Catalogue settings changed. Prepare a new preview; no product was created.",
    "Die Katalogeinstellungen haben sich geändert. Bereite eine neue Vorschau vor; es wurde kein Produkt angelegt.",
    "La configuration a changé. Préparez un nouvel aperçu ; aucun produit créé.",
    "La configuración cambió. Prepara otra vista previa; no se creó ningún producto.",
  ],
  "Product URL credentials are forbidden": [
    "Use a public product URL without login credentials.",
    "Verwende eine öffentliche Produkt-URL ohne Zugangsdaten.",
    "Utilisez une URL publique sans identifiants.",
    "Usa una URL pública sin credenciales.",
  ],
  "Product preparation unavailable; retry explicitly or upload a CSV": [
    "Product preparation is unavailable. Check the AI connection or upload a CSV; no products were saved.",
    "Die Produktvorbereitung ist nicht erreichbar. Prüfe die KI-Verbindung oder lade eine CSV hoch; es wurden keine Produkte gespeichert.",
    "Préparation indisponible. Vérifiez l’IA ou importez un CSV ; aucun produit enregistré.",
    "Preparación no disponible. Revisa la conexión IA o sube un CSV; no se guardaron productos.",
  ],
  "No usable products in the source; provide product detail URLs or upload a CSV in the shop currency":
    [
      "No usable products found. Use a product detail page or CSV in the shop currency.",
      "Keine verwendbaren Produkte gefunden. Verwende eine Produktdetailseite oder eine CSV in der Shop-Währung.",
      "Aucun produit exploitable. Utilisez une fiche produit ou un CSV dans la devise de la boutique.",
      "No se encontraron productos utilizables. Usa una página de producto o CSV en la divisa de la tienda.",
    ],
  "CSV headers: name,price required; description,productNumber,imageUrl optional":
    [
      "Use CSV columns name,price; optionally description,productNumber,imageUrl. Download the template for the exact format.",
      "Verwende die CSV-Spalten name,price; optional description,productNumber,imageUrl. Lade die Vorlage für das genaue Format herunter.",
      "Colonnes CSV : name,price ; facultatives : description,productNumber,imageUrl. Téléchargez le modèle.",
      "Columnas CSV: name,price; opcionales: description,productNumber,imageUrl. Descarga la plantilla.",
    ],
  "CSV has an unclosed quoted field": [
    "The CSV contains an unclosed quotation mark. Correct it and upload again.",
    "In der CSV fehlt ein schließendes Anführungszeichen. Korrigiere die Datei und lade sie erneut hoch.",
    "Guillemet non fermé dans le CSV. Corrigez et réimportez.",
    "Hay comillas sin cerrar en el CSV. Corrige y vuelve a subir.",
  ],
  "CSV has text after a closing quote": [
    "The CSV has text after a closing quote. Check quoted fields and delimiters.",
    "In der CSV steht Text nach einem schließenden Anführungszeichen. Prüfe Felder und Trennzeichen.",
    "Texte après un guillemet fermé. Vérifiez champs et séparateurs.",
    "Hay texto tras las comillas de cierre. Revisa campos y separadores.",
  ],
  "CSV needs a header and 1..50 products": [
    "Upload a CSV with a header and 1–50 products. Split larger files into reviewed batches.",
    "Lade eine CSV mit Kopfzeile und 1–50 Produkten hoch. Teile größere Dateien in einzelne Prüfdurchgänge auf.",
    "CSV avec en-tête et 1–50 produits requis. Divisez les fichiers plus grands.",
    "Se requiere CSV con cabecera y 1–50 productos. Divide los archivos grandes.",
  ],
  "CSV supports at most 50 products per reviewed batch": [
    "Split the CSV into batches of at most 50 products. No rows were imported.",
    "Teile die CSV in Durchgänge mit höchstens 50 Produkten. Es wurde keine Zeile importiert.",
    "Divisez le CSV en lots de 50 produits maximum. Aucune ligne importée.",
    "Divide el CSV en lotes de hasta 50 productos. No se importó ninguna fila.",
  ],
  "Catalogue intake saves require a private sandbox; live products were not changed":
    [
      "Choose a private sandbox before creating products. The live catalogue is unchanged.",
      "Wähle vor dem Anlegen eine private Sandbox. Das Live-Sortiment ist unverändert.",
      "Choisissez une sandbox privée. Le catalogue public reste inchangé.",
      "Elige una sandbox privada. El catálogo público no cambió.",
    ],
  "Catalogue language or currency changed; prepare fresh drafts": [
    "The main language or currency changed. Prepare a new preview before saving.",
    "Hauptsprache oder Währung wurden geändert. Bereite vor dem Speichern eine neue Vorschau vor.",
    "Langue ou devise modifiée. Préparez un nouvel aperçu.",
    "Cambió el idioma o divisa. Prepara otra vista previa.",
  ],
  "Product URL unavailable; upload a CSV instead": [
    "The product page is unavailable. Use another detail page or upload a CSV.",
    "Die Produktseite ist nicht erreichbar. Nutze eine andere Detailseite oder lade eine CSV hoch.",
    "Page indisponible. Utilisez une autre fiche ou un CSV.",
    "Página no disponible. Usa otra página o CSV.",
  ],
  "Product URL must return an accessible HTML page; upload a CSV instead": [
    "This URL did not return an accessible product page. Use a product detail page or CSV.",
    "Diese URL liefert keine zugängliche Produktseite. Verwende eine Produktdetailseite oder CSV.",
    "Cette URL ne fournit pas de page produit accessible. Utilisez une fiche ou un CSV.",
    "La URL no devuelve una página accesible. Usa un detalle de producto o CSV.",
  ],
};
export const catalogCsvRowError = [
  "CSV line {row}: check the column count, product name, price and description. Nothing was saved.",
  "CSV-Zeile {row}: Prüfe Spaltenanzahl, Produktname, Preis und Beschreibung. Es wurde nichts gespeichert.",
  "Ligne CSV {row} : vérifiez colonnes, nom, prix et description. Rien enregistré.",
  "Línea CSV {row}: revisa columnas, nombre, precio y descripción. No se guardó nada.",
] as const;

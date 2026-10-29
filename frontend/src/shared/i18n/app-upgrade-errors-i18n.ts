/** Native upgrade failures retain specific guidance across consent, Studio and API transports. */
export const appUpgradeErrors: Record<string, readonly string[]> = {
  "Upgrade would invalidate an active payment method; update its configuration first":
    [
      "An enabled payment method needs this provider contract. Disable or reconfigure it in Settings before installing this version.",
      "Eine aktive Zahlungsart benötigt diesen Anbieter. Deaktiviere sie oder passe sie in den Einstellungen an, bevor du diese Version installierst.",
      "Un moyen de paiement actif utilise ce prestataire. Désactivez-le ou adaptez-le dans les paramètres avant l’installation.",
      "Un método de pago activo necesita este proveedor. Desactívalo o ajústalo en Configuración antes de instalar esta versión.",
    ],
  "Upgrade would narrow an active payment method; update its configuration first":
    [
      "This update removes a configured country or currency from an enabled payment method. Adjust its settings first.",
      "Dieses Update entfernt ein konfiguriertes Land oder eine Währung einer aktiven Zahlungsart. Passe zuerst deren Einstellungen an.",
      "Cette mise à jour supprime un pays ou une devise configurés pour un moyen de paiement actif. Adaptez d’abord ses paramètres.",
      "Esta actualización elimina un país o una moneda configurados para un método de pago activo. Ajusta primero su configuración.",
    ],
  "Upgrade would invalidate an active flow; update its action and arguments first":
    [
      "An active flow needs its current action and inputs. Update it under Rules & flows before installing this version.",
      "Ein aktiver Flow benötigt seine bisherige Aktion und Eingaben. Passe ihn unter Regeln & Flows an, bevor du diese Version installierst.",
      "Un workflow actif utilise l’action et ses données actuelles. Modifiez-le dans Règles et workflows avant l’installation.",
      "Un flujo activo necesita su acción y sus datos actuales. Modifícalo en Reglas y flujos antes de instalar esta versión.",
    ],
  "Migration integer conversion failed": [
    "Migration integer conversion failed",
    "Ein gespeicherter Wert lässt sich nicht als ganze Zahl übernehmen. Korrigiere die Daten oder die Migration und prüfe erneut.",
    "Une valeur enregistrée ne peut pas être convertie en entier. Corrigez les données ou la migration.",
    "Un valor guardado no se puede convertir en entero. Corrige los datos o la migración.",
  ],
  "Changing/removing fields requires an explicit schema migration": [
    "Changing/removing fields requires an explicit schema migration",
    "Für geänderte oder entfernte Felder fehlt eine ausdrückliche Datenmigration. Ergänze sie im Datenmodell und prüfe erneut.",
    "Les champs modifiés ou supprimés nécessitent une migration explicite. Ajoutez-la au modèle.",
    "Los campos modificados o eliminados requieren una migración explícita. Añádela al modelo.",
  ],
  "New required field needs a data migration; add it nullable first": [
    "New required field needs a data migration; add it nullable first",
    "Das neue Pflichtfeld benötigt eine Datenmigration. Ergänze gültige Werte oder lege das Feld zunächst optional an.",
    "Le nouveau champ obligatoire nécessite une migration. Ajoutez des valeurs valides ou rendez-le facultatif.",
    "El nuevo campo obligatorio necesita una migración. Añade valores válidos o créalo primero como opcional.",
  ],
  "Upgrade would remove an action used by an active flow": [
    "Upgrade would remove an action used by an active flow",
    "Ein aktiver Flow benötigt diese Aktion. Passe den Flow an oder behalte die Aktion in der neuen App-Version.",
    "Un workflow actif utilise cette action. Modifiez le workflow ou conservez l’action.",
    "Un flujo activo utiliza esta acción. Modifica el flujo o conserva la acción.",
  ],
  "Upgrade would break an active app dependency": [
    "Upgrade would break an active app dependency",
    "Eine andere aktive App benötigt eine kompatible Version. Aktualisiere die abhängige App oder passe diese Version an.",
    "Une autre app active nécessite une version compatible. Mettez-la à jour ou adaptez cette version.",
    "Otra app activa requiere una versión compatible. Actualízala o adapta esta versión.",
  ],
  "Removing models requires an offline migration": [
    "Removing models requires an offline migration",
    "Dieses Datenmodell enthält eine bestehende Struktur. Sein Entfernen benötigt eine gesonderte Migration.",
    "La suppression de ce modèle existant nécessite une migration séparée.",
    "Eliminar este modelo existente requiere una migración independiente.",
  ],
};

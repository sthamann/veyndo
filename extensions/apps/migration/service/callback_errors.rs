//! Native callback failures have their own bounded origin/status and localized recovery guidance, never source credentials/body.
use super::*;
pub fn classify(error: &str) -> String {
    let status = [400, 401, 403, 404, 409, 429, 500, 502, 503]
        .into_iter()
        .find(|status| error.contains(&format!("(HTTP {status})")));
    match status {
        Some(status) => format!("Veyndo callback (HTTP {status})"),
        None => "Veyndo callback unavailable".into(),
    }
}
pub fn message(error: &str) -> Value {
    let text = if error.starts_with("Veyndo callback") {
        if error.contains("HTTP 409") {
            [
                "Veyndo import conflict (HTTP 409). The destination, source snapshot, options or job revision differs from the admitted import. Reuse the original destination and reviewed options, or prepare an explicit update. Existing records were not overwritten.",
                "Veyndo-Importkonflikt (HTTP 409). Ziel, Quellstand, Einstellungen oder Auftragsrevision weichen von der freigegebenen Übernahme ab. Nutze das ursprüngliche Ziel und die geprüften Einstellungen oder bereite eine ausdrückliche Änderung vor. Bestehende Datensätze wurden nicht überschrieben.",
                "Conflit d’import Veyndo (HTTP 409). Destination, source, options ou révision différentes de l’import admis. Reprenez la destination et les options d’origine ou préparez une modification explicite. Les données existantes n’ont pas été écrasées.",
                "Conflicto de importación Veyndo (HTTP 409). El destino, origen, opciones o revisión difieren del import admitido. Usa el destino y opciones originales o prepara una actualización explícita. No se sobrescribieron registros existentes.",
            ]
        } else if error.contains("HTTP 401") || error.contains("HTTP 403") {
            [
                "Veyndo denied the callback. Check current app approval, credential expiry and the creator’s domain/customer-data rights before resuming.",
                "Veyndo hat den Zugriff abgelehnt. Prüfe aktuelle App-Freigabe, Gültigkeit des Zugangs und die Fach-/Kundendatenrechte des Erstellers, bevor du fortsetzt.",
                "Veyndo a refusé l’accès. Vérifiez l’approbation de l’app, la validité de l’accès et les droits métier/données clients du créateur avant de reprendre.",
                "Veyndo denegó el acceso. Comprueba la aprobación de la app, la caducidad y los permisos del creador sobre datos de negocio/clientes antes de continuar.",
            ]
        } else if error.contains("HTTP 400") {
            [
                "Veyndo rejected the imported record (HTTP 400). Review native required fields, geographic references, tax/currency and approved mappings. The source connection is not the failing step.",
                "Veyndo hat den Importdatensatz abgelehnt (HTTP 400). Prüfe native Pflichtfelder, Länder-/Regionsbezüge, Steuer/Währung und die freigegebenen Zuordnungen. Der Fehler liegt nicht beim Quellzugang.",
                "Veyndo a refusé les données (HTTP 400). Vérifiez les champs requis, références géographiques, taxes/devises et mappages approuvés. La connexion source n’est pas en cause.",
                "Veyndo rechazó el registro (HTTP 400). Revisa campos obligatorios, referencias geográficas, impuestos/divisa y mapeos aprobados. La conexión de origen no es el paso que falla.",
            ]
        } else {
            [
                "Veyndo could not complete the callback. Check destination/job availability and service health, then review saved progress before resuming. Do not create a new source identity.",
                "Veyndo konnte den Aufruf nicht abschließen. Prüfe Ziel, Auftrag und Erreichbarkeit des Dienstes und kontrolliere den gespeicherten Fortschritt vor dem Fortsetzen. Lege keine neue Quellidentität an.",
                "Veyndo n’a pas terminé l’appel. Vérifiez destination, tâche et disponibilité du service, puis la progression enregistrée avant de reprendre. Ne créez pas de nouvelle identité source.",
                "Veyndo no pudo completar la llamada. Comprueba destino, tarea y estado del servicio; revisa el progreso guardado antes de continuar. No crees una identidad nueva de origen.",
            ]
        }
    } else {
        [error, error, error, error]
    };
    json!({"en":text[0],"de":text[1],"fr":text[2],"es":text[3]})
}

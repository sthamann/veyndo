//! Emit a bounded WIT component with immutable source provenance and executable native examples.
use crate::Request;
use serde_json::{Value, json};
fn label(en: &str, de: &str, es: &str, fr: &str) -> Value {
    json!({"en":en,"de":de,"es":es,"fr":fr})
}
pub(crate) fn manifest(
    r: &Request,
    digest: &str,
    name: &Value,
    decision: &crate::CartDiscount,
) -> Value {
    let basis_points = decision.basis_points;
    let source = format!(
        ";; {} compiler={} source={}\n{}",
        crate::PROFILE,
        env!("CARGO_PKG_VERSION"),
        digest,
        include_str!("../component.wat").replace("__BASIS_POINTS__", &basis_points.to_string())
    );
    let examples=[0,1,5,10,2490,10000,12345,100000000].into_iter().enumerate().map(|(i,minor)|{
        let amount=json!({"minor":minor,"currency":"EUR","scale":2});
        json!({"id":format!("source_{i}"),"label":label(&format!("Cart amount {minor}"),&format!("Warenkorbbetrag {minor}"),&format!("Importe {minor}"),&format!("Montant {minor}")),
            "hook":"discount","snapshot":{"subtotal":amount},"context":{},
            "expected":{"adjustment":{"minor":(minor*basis_points+5000)/10000,"currency":"EUR","scale":2},"accepted":true,"reasonCode":"shopware_discount"}})
    }).collect::<Vec<_>>();
    json!({"id":r.app_id,"version":r.version,"coreApi":"1","runtime":"declarative","category":"commerce",
        "name":name,
        "permissions":["commerce.hooks"],"commerceHooks":{"source":source,"hooks":["discount"]},
        "entities":[],"actions":[],"slots":[],"events":[],"views":[],"surfaces":[],
        "capability":{"version":1,
            "intent":label("Apply the translated percentage to the native goods subtotal.","Den übersetzten Prozentsatz auf den nativen Warenwert anwenden.","Aplicar el porcentaje traducido al subtotal nativo.","Appliquer le pourcentage traduit au sous-total natif."),
            "assumptions":[label("Native line allocation, tax and order representation apply; this profile translates the aggregate discount decision.","Native Positionsverteilung, Steuern und Bestelldarstellung gelten; dieses Profil übersetzt die gesamte Rabattentscheidung.","Se aplica la distribución, fiscalidad y representación nativa del pedido.","La répartition, la fiscalité et la représentation natives s'appliquent."),
                label(&format!("Source digest: {digest}"),&format!("Quellstand: {digest}"),&format!("Origen: {digest}"),&format!("Source : {digest}"))],"examples":examples}})
}

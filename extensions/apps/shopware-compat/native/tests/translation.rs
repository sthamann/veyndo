//! Source-to-WIT behavior and hostile-input regressions use the real shared component engine.
use std::collections::BTreeMap;
use veyndo_apps::component_runtime::{CartSnapshot, Kind, Module, Money, Snapshot};
use veyndo_shopware_native::{Request, translate};
fn request() -> Request {
    Request {
        app_id: "imported_discount".into(),
        version: "1.0.0".into(),
        files: BTreeMap::from([
            (
                "composer.json".into(),
                include_str!("fixture/composer.json").into(),
            ),
            (
                "src/NativeDiscountReference.php".into(),
                include_str!("fixture/src/NativeDiscountReference.php").into(),
            ),
            (
                "src/DiscountProcessor.php".into(),
                include_str!("fixture/src/DiscountProcessor.php").into(),
            ),
            (
                "src/Resources/config/services.xml".into(),
                include_str!("fixture/src/Resources/config/services.xml").into(),
            ),
        ]),
    }
}
fn snapshot(minor: i64, currency: &str, scale: u8) -> Snapshot {
    Snapshot {
        cart: CartSnapshot {
            items: vec![],
            subtotal: Money {
                minor,
                currency: currency.into(),
                scale,
            },
        },
        products: Default::default(),
        records: Default::default(),
    }
}
#[test]
fn original_source_drives_native_component_and_source_changes_change_results() {
    let mut r = request();
    let first = translate(&r);
    assert!(first.manifest.is_some(), "{:?}", first.diagnostics);
    // Studio's manual/agent import requires these explicit arrays, even for a pure hook.
    assert_eq!(
        first.manifest.as_ref().unwrap()["views"],
        serde_json::json!([])
    );
    assert_eq!(
        first.manifest.as_ref().unwrap()["surfaces"],
        serde_json::json!([])
    );
    let decision = first.decision.as_ref().unwrap();
    assert_eq!(
        first.manifest.as_ref().unwrap()["name"]["de-DE"],
        "Nativer Rabattvergleich"
    );
    assert!(first.manifest.as_ref().unwrap()["name"].get("es").is_none());
    assert_eq!(decision.basis_points, 1000);
    assert_eq!(decision.label, "Native discount reference");
    assert_eq!(decision.source_line_id, "native-discount-reference");
    let source = first.manifest.as_ref().unwrap()["commerceHooks"]["source"]
        .as_str()
        .unwrap();
    let module = Module::new(source).unwrap();
    module.validate_interface().unwrap();
    for (minor, expected) in [
        (0, 0),
        (1, 0),
        (5, 1),
        (15, 2),
        (2490, 249),
        (12345, 1235),
        (100000000, 10000000),
    ] {
        let out = module
            .evaluate(snapshot(minor, "EUR", 2), Kind::Discount, "{}")
            .unwrap();
        assert_eq!(out.adjustment.minor, expected);
        assert!(out.accepted);
    }
    assert_eq!(
        module
            .evaluate(snapshot(12345, "JPY", 0), Kind::Discount, "{}")
            .unwrap()
            .adjustment
            .currency,
        "JPY"
    );
    assert!(
        module
            .evaluate(snapshot(100000001, "EUR", 2), Kind::Discount, "{}")
            .is_err()
    );
    assert!(
        module
            .evaluate(snapshot(100, "EUR", 2), Kind::Price, "{}")
            .is_err()
    );
    r.files
        .get_mut("src/DiscountProcessor.php")
        .unwrap()
        .push_str("\n// A source revision is part of package provenance.\n");
    assert_ne!(translate(&r).source_digest, first.source_digest);
    r.files
        .get_mut("src/DiscountProcessor.php")
        .unwrap()
        .replace_range(
            ..,
            &include_str!("fixture/src/DiscountProcessor.php").replace("(-10)", "(-12.5)"),
        );
    let changed = translate(&r);
    assert!(changed.manifest.is_some(), "{:?}", changed.diagnostics);
    let module = Module::new(
        changed.manifest.unwrap()["commerceHooks"]["source"]
            .as_str()
            .unwrap(),
    )
    .unwrap();
    assert_eq!(
        module
            .evaluate(snapshot(10000, "EUR", 2), Kind::Discount, "{}")
            .unwrap()
            .adjustment
            .minor,
        1250
    );
}
#[test]
fn unknown_code_resources_and_dependencies_block_the_whole_package() {
    let original = request();
    for needle in [
        "system('touch /tmp/never');",
        "file_get_contents('https://example.test');",
        "eval('1');",
        "$data->set('secret', 42);",
        "$this->calculator->unknown();",
        "while (true) {}",
        "$_SESSION = 42;",
        "$this = $this;",
    ] {
        let mut r = request();
        let p = r.files.get_mut("src/DiscountProcessor.php").unwrap();
        *p = p.replace("$definition =", &format!("{needle}\n        $definition ="));
        let report = translate(&r);
        assert!(report.manifest.is_none(), "{needle}");
        assert_eq!(report.diagnostics[0].file, "src/DiscountProcessor.php");
        assert!(report.diagnostics[0].line >= 16);
    }
    for path in [
        "../outside.php",
        "src/Resources/app/storefront/main.js",
        "src/Migration.sql",
    ] {
        let mut r = request();
        r.files.insert(path.into(), "forbidden".into());
        assert!(translate(&r).manifest.is_none());
    }
    let mut r = request();
    r.files
        .get_mut("src/Resources/config/services.xml")
        .unwrap()
        .push_str("<!DOCTYPE container SYSTEM 'file:///etc/passwd'>");
    assert!(translate(&r).manifest.is_none());
    let mut r = request();
    r.files
        .get_mut("src/DiscountProcessor.php")
        .unwrap()
        .push_str("\nfunction sneaky() {system('id');}\n");
    assert!(translate(&r).manifest.is_none());
    let mut r = request();
    *r.files.get_mut("composer.json").unwrap() =
        original.files["composer.json"].replace("\"require\":", "\"scripts\":{},\"require\":");
    assert!(translate(&r).manifest.is_none());
}
#[test]
fn alias_resolution_does_not_grant_capabilities_by_short_class_name() {
    let mut r = request();
    let p = r.files.get_mut("src/DiscountProcessor.php").unwrap();
    *p = p.replace(
        "Shopware\\Core\\Checkout\\Cart\\Price\\PercentagePriceCalculator",
        "Evil\\PercentagePriceCalculator",
    );
    assert!(translate(&r).manifest.is_none());
    let mut r = request();
    let p = r.files.get_mut("src/DiscountProcessor.php").unwrap();
    *p = p
        .replace(
            "use Shopware\\Core\\Checkout\\Cart\\Price\\PercentagePriceCalculator;",
            "use Shopware\\Core\\Checkout\\Cart\\Price\\PercentagePriceCalculator as Calculator;",
        )
        .replace("readonly PercentagePriceCalculator", "readonly Calculator");
    assert!(translate(&r).manifest.is_some());
}

#[test]
fn altered_registration_and_php_contracts_never_emit_partial_packages() {
    for (old, new) in [
        ("public function process", "private function process"),
        (
            "public function __construct",
            "protected function __construct",
        ),
        ("): void", "): string"),
        (
            "final class DiscountProcessor",
            "abstract class DiscountProcessor",
        ),
        ("$context, CartBehavior", "$toCalculate, CartBehavior"),
    ] {
        let mut r = request();
        let p = r.files.get_mut("src/DiscountProcessor.php").unwrap();
        *p = p.replace(old, new);
        assert!(translate(&r).manifest.is_none(), "{new}");
    }
    let mut r = request();
    r.files.insert(
        "src/Duplicate.php".into(),
        r.files["src/NativeDiscountReference.php"].clone(),
    );
    assert!(translate(&r).manifest.is_none());
    let mut r = request();
    r.files.insert(
        "src/Deep.php".into(),
        format!("<?php {}0{};", "(".repeat(4000), ")".repeat(4000)),
    );
    let result = translate(&r);
    assert!(result.manifest.is_none());
    assert!(result.diagnostics[0].message.contains("budget"));
    for (old, new) in [
        ("<services>", "<services><services>"),
        (
            "</services>",
            "<tag name=\"shopware.cart.processor\" priority=\"4500\"/></services>",
        ),
        ("<service id=", "<service factory=\"other\" id="),
        ("priority=\"4500\"", "priority=\"4900\""),
    ] {
        let mut r = request();
        let xml = r
            .files
            .get_mut("src/Resources/config/services.xml")
            .unwrap();
        *xml = xml.replace(old, new);
        assert!(translate(&r).manifest.is_none(), "{new}");
    }
    let mut r = request();
    for (name, source) in r.files.iter_mut() {
        if name.ends_with(".php") {
            *source = source.replace("<?php", "<?php\ndeclare(strict_types=1);");
        }
    }
    assert!(translate(&r).manifest.is_some());
}

#[test]
fn autoload_side_effects_and_changed_cart_reads_cannot_be_silently_normalized() {
    for field in ["scripts", "repositories", "config", "autoload-dev"] {
        let mut r = request();
        let mut composer: serde_json::Value =
            serde_json::from_str(&r.files["composer.json"]).unwrap();
        composer[field] = serde_json::json!({});
        r.files.insert("composer.json".into(), composer.to_string());
        assert!(translate(&r).manifest.is_none(), "{field}");
    }
    let mut r = request();
    let source = r.files.remove("src/DiscountProcessor.php").unwrap();
    r.files.insert("src/WrongFile.php".into(), source);
    assert!(translate(&r).manifest.is_none());
    // PHP's collection is mutable. Reading it after adding a line is no longer
    // the initial goods subtotal represented by the native decision.
    let mut r = request();
    let p = r.files.get_mut("src/DiscountProcessor.php").unwrap();
    *p = p.replace(
        "$toCalculate->add($discount);",
        "$toCalculate->add($discount); $prices = $toCalculate->getLineItems()->getPrices();",
    );
    assert!(translate(&r).manifest.is_none());
}

#[test]
fn original_plugin_names_preserve_arbitrary_locales_without_invented_translations() {
    let mut r = request();
    let mut composer: serde_json::Value = serde_json::from_str(&r.files["composer.json"]).unwrap();
    composer["extra"]["label"] =
        serde_json::json!({"nl-NL":"Winkelkorting", "de-DE":"Warenkorbrabatt"});
    r.files.insert("composer.json".into(), composer.to_string());
    let report = translate(&r);
    assert_eq!(report.manifest.unwrap()["name"], composer["extra"]["label"]);
    composer["extra"]["label"]["nl-NL"] = serde_json::json!(17);
    r.files.insert("composer.json".into(), composer.to_string());
    assert!(translate(&r).manifest.is_none());
}

#[test]
fn leading_php_output_is_not_stripped_from_source() {
    let mut r = request();
    let source = r.files.get_mut("src/DiscountProcessor.php").unwrap();
    source.insert(0, '\u{feff}');
    let report = translate(&r);
    assert!(report.manifest.is_none());
    assert_eq!(report.diagnostics[0].file, "src/DiscountProcessor.php");
}

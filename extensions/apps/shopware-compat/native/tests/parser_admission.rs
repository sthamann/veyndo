//! Real compiler subprocesses reject adversarial recursive syntax without aborting the service host.
use std::{
    collections::BTreeMap,
    io::Write,
    process::{Command, Stdio},
};
use veyndo_shopware_native::{Request, translate};

fn request() -> Request {
    let root = std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("native/tests/fixture");
    let mut files = BTreeMap::new();
    for name in [
        "composer.json",
        "src/NativeDiscountReference.php",
        "src/DiscountProcessor.php",
        "src/Resources/config/services.xml",
    ] {
        files.insert(
            name.into(),
            std::fs::read_to_string(root.join(name)).unwrap(),
        );
    }
    Request {
        app_id: "parser_probe".into(),
        version: "1.0.0".into(),
        files,
    }
}

#[test]
fn recursive_operators_and_alternative_syntax_are_bounded_before_ast_parsing() {
    let sources = [
        format!("<?php {}$x;", "clone ".repeat(3500)),
        format!("<?php {}$x;", "throw ".repeat(3500)),
        format!("<?php {}$x;", "yield ".repeat(3500)),
        format!("<?php {}$x;", "@".repeat(3500)),
        format!("<?php {}$x;", "(int)".repeat(3500)),
        format!("<?php {}0{};", "(".repeat(4000), ")".repeat(4000)),
        format!("<?php {}{}", "if(true):;".repeat(500), "endif;".repeat(500)),
        format!("<?php {}$x;", "clone /* ; {{ */ ".repeat(1000)),
    ];
    for source in sources {
        let mut r = request();
        r.files.insert("src/Deep.php".into(), source);
        let mut child = Command::new(env!("CARGO_BIN_EXE_shopware-native"))
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn()
            .unwrap();
        child
            .stdin
            .take()
            .unwrap()
            .write_all(&serde_json::to_vec(&r).unwrap())
            .unwrap();
        let output = child.wait_with_output().unwrap();
        assert_eq!(
            output.status.code(),
            Some(2),
            "{}",
            String::from_utf8_lossy(&output.stderr)
        );
        let report: serde_json::Value = serde_json::from_slice(&output.stdout).unwrap();
        assert!(report["manifest"].is_null());
        assert!(
            report["diagnostics"][0]["message"]
                .as_str()
                .unwrap()
                .contains("budget")
        );
    }
    // Legitimate source remains usable after rejected inputs, on a worker-sized stack.
    std::thread::Builder::new()
        .stack_size(2 * 1024 * 1024)
        .spawn(|| {
            assert!(translate(&request()).manifest.is_some());
        })
        .unwrap()
        .join()
        .unwrap();
}

#[test]
fn comments_and_literal_contents_are_not_executable_syntax() {
    let mut r = request();
    r.files
        .get_mut("src/DiscountProcessor.php")
        .unwrap()
        .push_str(&format!("\n/* {} */", "clone @ ( ".repeat(1000)));
    let report = translate(&r);
    assert!(report.manifest.is_some(), "{:?}", report.diagnostics);
}

//! Read a bounded source package from stdin; print a reviewable report without installing anything.
use std::io::{self, Read};
fn main() -> std::process::ExitCode {
    let mut bytes = Vec::new();
    let result = io::stdin()
        .take(524289)
        .read_to_end(&mut bytes)
        .map_err(|e| e.to_string())
        .and_then(|_| {
            if bytes.len() > 524288 {
                return Err("Request exceeds 512 KiB".into());
            }
            serde_json::from_slice::<veyndo_shopware_native::Request>(&bytes)
                .map_err(|e| e.to_string())
        });
    match result {
        Ok(request) => {
            let report = veyndo_shopware_native::translate(&request);
            let ready = report.manifest.is_some();
            match serde_json::to_string_pretty(&report) {
                Ok(json) => println!("{json}"),
                Err(e) => {
                    eprintln!("{e}");
                    return std::process::ExitCode::FAILURE;
                }
            }
            if ready {
                std::process::ExitCode::SUCCESS
            } else {
                std::process::ExitCode::from(2)
            }
        }
        Err(e) => {
            eprintln!("{e}");
            std::process::ExitCode::FAILURE
        }
    }
}

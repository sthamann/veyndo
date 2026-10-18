//! Streaming source-export packaging writes private immutable files; a manifest appears only after all rows validate.
use super::*;
use export_manifest::{Manifest, Page, digest};
#[cfg(unix)]
use std::os::unix::fs::{DirBuilderExt, OpenOptionsExt};
use std::{
    collections::HashSet,
    fs,
    io::{BufRead, Read, Write},
    path::Path,
};
fn write(path: &Path, bytes: &[u8]) -> Result<()> {
    let mut options = fs::OpenOptions::new();
    options.write(true).create_new(true);
    #[cfg(unix)]
    options.mode(0o600);
    let mut file = options
        .open(path)
        .map_err(|_| "Export file exists or cannot be created")?;
    file.write_all(bytes)
        .map_err(|_| "Export file write failed")?;
    file.sync_all()
        .map_err(|_| "Export file sync failed".into())
}
fn flush(
    root: &Path,
    m: &mut Manifest,
    rows: &mut Vec<Value>,
    normalized: &mut usize,
) -> Result<()> {
    if rows.is_empty() {
        return Ok(());
    }
    let body = serde_json::to_vec(rows).map_err(|_| "Export page encoding failed")?;
    let hash = digest(&body);
    let path = format!("page-{:06}-{hash}.json", m.pages.len() + 1);
    write(&root.join(&path), &body)?;
    m.pages.push(Page {
        path,
        sha256: hash,
        bytes: body.len(),
        source_records: rows.len(),
        normalized_records: *normalized,
    });
    rows.clear();
    *normalized = 0;
    Ok(())
}
pub fn run(args: &[String]) -> Result<()> {
    if !(8..=9).contains(&args.len()) {
        return Err("pack SOURCE KIND CURRENCY LOCALE SOURCE_SHOP API_VERSION NEW_DIRECTORY [SCALE]; stream original expanded source JSON lines".into());
    }
    let c = config::Connection {
        system: Source::parse(&args[1])?,
        origin: args[5].trim_end_matches('/').into(),
        version: args[6].clone(),
        token: String::new(),
        username: String::new(),
        currency: args[3].clone(),
        locale: args[4].clone(),
        scale: if args.len() == 9 {
            args[8]
                .parse()
                .map_err(|_| "Invalid export currency scale")?
        } else if args[3] == "EUR" {
            2
        } else {
            return Err("Explicit non-EUR currency scale required".into());
        },
        languages: serde_json::from_str(
            &std::env::var("MIGRATION_LANGUAGE_MAP").unwrap_or("{}".into()),
        )
        .map_err(|_| "Invalid source language map")?,
        timezone: std::env::var("MIGRATION_SOURCE_TIMEZONE").ok(),
        export_manifest: None,
        export_digest: None,
        export_token: None,
    };
    config::original_identity(&c.origin)?;
    let context = Context {
        source: c.system,
        shop: c.origin.clone(),
        currency: c.currency.clone(),
        scale: c.scale,
        locale: c.locale.clone(),
        languages: c.languages.clone(),
        timezone: c.timezone.clone(),
    };
    context.validate()?;
    veyndo_commerce::money::Currency::new(&c.currency, c.scale).map_err(str::to_owned)?;
    if ![
        "products",
        "categories",
        "customers",
        "orders",
        "pages",
        "reviews",
        "coupons",
    ]
    .contains(&args[2].as_str())
        || c.version.is_empty()
        || c.version.len() > 30
    {
        return Err("Explicit supported export domain and API version required".into());
    }
    let root = Path::new(&args[7]);
    let mut builder = fs::DirBuilder::new();
    #[cfg(unix)]
    builder.mode(0o700);
    builder
        .create(root)
        .map_err(|_| "Export directory exists or cannot be created; use a new private directory")?;
    let mut manifest = Manifest {
        format_version: 1,
        source: export_manifest::source(&c),
        kind: args[2].clone(),
        source_records: 0,
        normalized_records: 0,
        pages: vec![],
    };
    let mut rows = vec![];
    let mut normalized = 0;
    let mut raw_bytes = 2;
    let mut expanded_bytes = 0;
    let mut identities = HashSet::new();
    let input = std::io::stdin();
    let mut input = input.lock();
    loop {
        let mut line = String::new();
        let n = input
            .by_ref()
            .take(1_048_577)
            .read_line(&mut line)
            .map_err(|_| "Export source read failed")?;
        if n == 0 {
            break;
        }
        if n > 1_048_576 {
            return Err("Export input row exceeds 1 MiB".into());
        }
        let value: Value =
            serde_json::from_str(&line).map_err(|_| "Invalid original source JSON line")?;
        export_readiness::validate(&context, &args[2], &value)?;
        let records = adapters::normalize(&context, &args[2], &value)?;
        if records.is_empty()
            || records.len() > 5000
            || records
                .iter()
                .any(|r| !identities.insert(r.source_id.clone()))
        {
            return Err("Empty, oversized or duplicate source identity in export".into());
        }
        let cost = value.to_string().len() + 1;
        let expanded = serde_json::to_vec(&records)
            .map_err(|_| "Export record encoding failed")?
            .len();
        if cost + 2 > 1_048_576 || expanded > 4 * 1024 * 1024 {
            return Err("Expanded export row exceeds package page bounds".into());
        }
        if rows.len() == 50
            || raw_bytes + cost > 1_048_576
            || normalized + records.len() > 5000
            || expanded_bytes + expanded > 4 * 1024 * 1024
        {
            flush(root, &mut manifest, &mut rows, &mut normalized)?;
            raw_bytes = 2;
            expanded_bytes = 0;
        }
        raw_bytes += cost;
        expanded_bytes += expanded;
        normalized += records.len();
        rows.push(value);
        manifest.source_records += 1;
        manifest.normalized_records += records.len();
        if manifest.source_records > 500_000
            || manifest.normalized_records > 2_000_000
            || manifest.pages.len() >= 10_000
        {
            return Err(
                "Export exceeds bounded package profile; split domains/source scope explicitly"
                    .into(),
            );
        }
    }
    flush(root, &mut manifest, &mut rows, &mut normalized)?;
    manifest.validate(&c, &args[2])?;
    let body = serde_json::to_vec(&manifest).map_err(|_| "Export manifest encoding failed")?;
    if body.len() > 4 * 1024 * 1024 {
        return Err("Export manifest exceeds 4 MiB".into());
    }
    write(&root.join("manifest.json"), &body)?;
    println!(
        "{}",
        json!({"manifest":"manifest.json","digest":digest(&body),"sourceRecords":manifest.source_records,"normalizedRecords":manifest.normalized_records,"pages":manifest.pages.len(),"cutoverReady":false})
    );
    Ok(())
}

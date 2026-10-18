//! Independent Rust migration entry: bounded streaming source normalization and app gateway service.
#[path = "../adapters/mod.rs"]
mod adapters;
mod batch;
mod config;
#[path = "../contract/mod.rs"]
mod contract;
mod core;
mod events;
mod extract;
mod media;
mod server;
mod shopify;
mod slices;
mod transport;
use contract::*;
use serde_json::{Value, json};
use std::io::{BufRead, Read, Write};
fn normalize(args: &[String]) -> Result<()> {
    if !(6..=7).contains(&args.len()) {
        return Err(
            "normalize SOURCE KIND CURRENCY LOCALE SOURCE_SHOP; stream one JSON record per line"
                .into(),
        );
    }
    let c = Context {
        source: Source::parse(&args[1])?,
        currency: args[3].clone(),
        locale: args[4].clone(),
        shop: args[5].clone(),
        timezone: std::env::var("MIGRATION_SOURCE_TIMEZONE").ok(),
        languages: serde_json::from_str(
            &std::env::var("MIGRATION_LANGUAGE_MAP").unwrap_or("{}".into()),
        )
        .map_err(|_| "Invalid explicit source language mapping")?,
        scale: if args.len() == 7 {
            args[6].parse().map_err(|_| "invalid currency scale")?
        } else if args[3] == "EUR" {
            2
        } else {
            return Err("explicit currency scale required for non-EUR source".into());
        },
    };
    c.validate()?;
    let input = std::io::stdin();
    let mut input = input.lock();
    let output = std::io::stdout();
    let mut output = std::io::BufWriter::new(output.lock());
    loop {
        let mut line = String::new();
        let n = input
            .by_ref()
            .take(1_048_577)
            .read_line(&mut line)
            .map_err(|_| "source read failed")?;
        if n == 0 {
            break;
        }
        if n > 1_048_576 {
            return Err("source line exceeds 1 MiB".into());
        }
        let v = serde_json::from_str(&line).map_err(|_| "invalid source JSON line")?;
        for row in adapters::normalize(&c, &args[2], &v)? {
            serde_json::to_writer(&mut output, &row).map_err(|_| "record encoding failed")?;
            writeln!(output).map_err(|_| "record write failed")?;
        }
    }
    output.flush().map_err(|_| "record flush failed".into())
}
#[tokio::main]
async fn main() {
    let args = std::env::args().skip(1).collect::<Vec<_>>();
    let result = if args.first().map(String::as_str) == Some("serve") {
        server::run().await
    } else if args.first().map(String::as_str) == Some("normalize") {
        normalize(&args)
    } else {
        Err("select normalize SOURCE KIND CURRENCY LOCALE SOURCE_SHOP".into())
    };
    if let Err(e) = result {
        eprintln!("Migration: {e}");
        std::process::exit(1);
    }
}

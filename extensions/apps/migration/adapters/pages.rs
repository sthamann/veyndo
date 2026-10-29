//! Source content becomes editable native page blocks; executable embeds and unresolved media fail before import.
use super::*;
use scraper::{ElementRef, Html};
pub fn destination(c: &Context, data: &Value) -> Result<Value> {
    let slug = data["slug"][&c.locale]
        .as_str()
        .filter(|s| {
            !s.is_empty()
                && s.len() <= 100
                && s.bytes()
                    .all(|b| b.is_ascii_lowercase() || b.is_ascii_digit() || b == b'-')
        })
        .ok_or("Map a valid page slug before import")?;
    let bodies = data["body"]
        .as_object()
        .ok_or("Translated page content required")?;
    let mut rich = serde_json::Map::new();
    for (locale, html) in bodies {
        rich.insert(
            locale.clone(),
            document(html.as_str().ok_or("Invalid source page body")?)?,
        );
    }
    Ok(
        json!({"app":"site_builder","action":"save_page","fields":{"channel":"default","slug":slug,"title":data["title"],"kind":"page","status":"draft","starts_at":null,"content":{"blocks":[{"id":"source_content","kind":"text","text":{},"rich":rich,"image":"","products":[],"fields":[]}]},"theme":{},"seo":null,"author":null,"category":null}}),
    )
}
/// Product HTML uses the same bounded native document parser as authored pages.
pub(super) fn product_content(data: &mut Value) -> Result<()> {
    let bodies = data["description"].as_object().cloned().unwrap_or_default();
    let mut rich = serde_json::Map::new();
    for (locale, value) in bodies {
        let Some(html) = value.as_str().filter(|s| s.contains('<')) else {
            continue;
        };
        let doc = document(html)?;
        data["description"][&locale] = json!(
            plain(&doc[0]["doc"])
                .split_whitespace()
                .collect::<Vec<_>>()
                .join(" ")
        );
        rich.insert(locale, doc);
    }
    if !rich.is_empty() {
        data["richDescription"] = json!(rich);
    }
    Ok(())
}
fn document(html: &str) -> Result<Value> {
    if html.len() > 64 * 1024 {
        return Err("Page exceeds editable content limit".into());
    }
    let fragment = Html::parse_fragment(html);
    let nodes = blockify(children(fragment.root_element(), &[], 0)?);
    Ok(json!([{"type":"document","doc":{"type":"doc","content":nodes}}]))
}
fn plain(node: &Value) -> String {
    if node["type"] == "text" {
        return node["text"].as_str().unwrap_or("").into();
    }
    let mut out = node["content"]
        .as_array()
        .into_iter()
        .flatten()
        .map(plain)
        .collect::<String>();
    if ["paragraph", "heading", "listItem", "hardBreak"]
        .iter()
        .any(|t| node["type"] == *t)
    {
        out.push('\n');
    }
    out
}
fn children(element: ElementRef<'_>, marks: &[Value], depth: usize) -> Result<Vec<Value>> {
    if depth > 24 {
        return Err("Source content is too deeply nested".into());
    }
    let mut out = vec![];
    for child in element.children() {
        if let Some(text) = child.value().as_text() {
            if !text.is_empty() {
                out.push(json!({"type":"text","text":text.to_string(),"marks":marks}));
            }
            continue;
        }
        let Some(e) = ElementRef::wrap(child) else {
            continue;
        };
        let tag = e.value().name();
        if [
            "script", "style", "iframe", "object", "embed", "form", "input", "img", "video",
            "table",
        ]
        .contains(&tag)
        {
            return Err(format!(
                "Source page contains unsupported {tag}; map its content/media explicitly before importing"
            ));
        }
        let mut current = marks.to_vec();
        if let Some(kind) = match tag {
            "b" | "strong" => Some("bold"),
            "i" | "em" => Some("italic"),
            "u" => Some("underline"),
            "s" | "del" => Some("strike"),
            "code" => Some("code"),
            _ => None,
        } {
            current.push(json!({"type":kind}));
        }
        if tag == "a" {
            let href = e.value().attr("href").unwrap_or("");
            let url = reqwest::Url::parse(href)
                .map_err(|_| "Relative/invalid source link needs mapping")?;
            if url.scheme() != "https" || !url.username().is_empty() || url.password().is_some() {
                return Err("Unsafe source page link".into());
            }
            current.push(json!({"type":"link","attrs":{"href":href}}));
        }
        let nested = children(e, &current, depth + 1)?;
        let kind = match tag {
            "p" => Some("paragraph"),
            "h1" | "h2" | "h3" | "h4" | "h5" | "h6" => Some("heading"),
            "ul" => Some("bulletList"),
            "ol" => Some("orderedList"),
            "li" => Some("listItem"),
            "blockquote" => Some("blockquote"),
            "pre" => Some("codeBlock"),
            "br" => Some("hardBreak"),
            "hr" => Some("horizontalRule"),
            _ => None,
        };
        if let Some(kind) = kind {
            let mut node = json!({"type":kind,"content":if matches!(kind,"listItem"|"blockquote"){blockify(nested)}else{nested}});
            if kind == "orderedList" {
                let start = e
                    .value()
                    .attr("start")
                    .unwrap_or("1")
                    .parse::<u32>()
                    .map_err(|_| "Invalid source list start")?;
                if start > 1_000_000 {
                    return Err("Source list start exceeds limit".into());
                }
                node["attrs"] = json!({"start":start});
            }
            if kind == "heading" {
                node["attrs"] = json!({"level":if tag=="h1"||tag=="h2"{2}else{3}});
            }
            out.push(node);
        } else {
            out.extend(nested);
        }
        if out.len() > 2000 {
            return Err("Source page exceeds node limit".into());
        }
    }
    Ok(out)
}

/// Tiptap documents/list items require block children; retain spaces within inline runs.
fn blockify(nodes: Vec<Value>) -> Vec<Value> {
    fn flush(out: &mut Vec<Value>, inline: &mut Vec<Value>) {
        if inline
            .iter()
            .any(|v| v["text"].as_str().is_none_or(|s| !s.trim().is_empty()))
        {
            out.push(json!({"type":"paragraph","content":inline}));
        }
        inline.clear();
    }
    let mut out = vec![];
    let mut inline = vec![];
    for node in nodes {
        if matches!(node["type"].as_str(), Some("text" | "hardBreak")) {
            inline.push(node);
        } else {
            flush(&mut out, &mut inline);
            out.push(node);
        }
    }
    flush(&mut out, &mut inline);
    out
}

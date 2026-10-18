//! Source reviews become plain original content with explicit dates; source verification never becomes native purchase proof.
use super::*;
pub fn review(c: &Context, v: &Value) -> Result<Value> {
    for key in ["verified", "verified_purchase"] {
        if v.get(key)
            .is_some_and(|value| !value.is_null() && !value.is_boolean())
        {
            return Err("Source verification claim must be boolean or null".into());
        }
    }
    let original = text(&field(v, &["review", "detail", "content"]));
    let html = scraper::Html::parse_fragment(&original);
    let unsafe_nodes = scraper::Selector::parse("script,style,iframe,object,embed").unwrap();
    if html.select(&unsafe_nodes).next().is_some() {
        return Err("Executable/embedded review content requires manual source review".into());
    }
    let content = html
        .root_element()
        .text()
        .collect::<Vec<_>>()
        .join(" ")
        .trim()
        .to_string();
    let title = text(&field(v, &["title", "headline"]));
    let title = if title.is_empty() {
        content.chars().take(120).collect::<String>()
    } else {
        title
    };
    let rating = text(&field(v, &["rating", "grade", "points"]))
        .parse::<u8>()
        .ok()
        .filter(|n| (1..=5).contains(n))
        .ok_or("Map the source rating to an explicit 1..5 scale before importing")?;
    let author = text(&field(v, &["reviewer", "nickname", "customer"]));
    if author.trim().is_empty()
        || author.chars().count() > 80
        || content.is_empty()
        || content.chars().count() > 3000
        || title.chars().count() > 120
    {
        return Err(
            "Original review author/title/content is missing or exceeds native limits".into(),
        );
    }
    let created = super::dates::created(c, v)?;
    if created.is_null() {
        return Err("Original review date required; no synthetic current date is assigned".into());
    }
    Ok(
        json!({"productSourceId":text(&field(v,&["product_id","entity_pk_value","id_product","articleId"])),"title":title,"text":content,"rating":rating,"sourceAuthor":author,"createdAt":created,"sourceVerified":field(v,&["verified","verified_purchase"]),"verifiedPurchase":false}),
    )
}

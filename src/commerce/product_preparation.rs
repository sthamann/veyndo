//! Opt-in bounded catalogue preparation projection. Existing products, translations and image jobs remain the owners.
use super::*;

pub(super) async fn attach(
    a: &App,
    tenant: &str,
    products: &mut [Value],
    sources: &[sqlx::postgres::PgRow],
) -> Result<()> {
    if products.is_empty() {
        return Ok(());
    }
    let ids = products
        .iter()
        .filter_map(|p| p["id"].as_str())
        .collect::<Vec<_>>();
    // Fetch only the already-authorized page, never the whole shop or binary media.
    let translations = sqlx::query("SELECT product_id,language_id,name,description FROM product_translations WHERE tenant=$1 AND product_id=ANY($2)")
        .bind(tenant).bind(&ids).fetch_all(&a.db).await?;
    let jobs = sqlx::query("SELECT DISTINCT ON(product_id) product_id,id,state FROM media_jobs WHERE tenant=$1 AND product_id=ANY($2) ORDER BY product_id,created_at DESC,id DESC")
        .bind(tenant).bind(&ids).fetch_all(&a.db).await?;
    let languages = performance::languages(a).await?;
    let (settings, _) = config(a, tenant).await?;
    for product in products {
        let id = product["id"].as_str().unwrap_or_default();
        let source = sources.iter().find(|r| r.get::<String, _>("id") == id);
        let locales = |description: bool| {
            let field = if description { "description" } else { "name" };
            settings
                .locales
                .iter()
                .filter(|locale| {
                    let translated = languages
                        .iter()
                        .find(|l| &l.locale == *locale)
                        .and_then(|language| {
                            translations.iter().find(|r| {
                                r.get::<String, _>("product_id") == id
                                    && r.get::<String, _>("language_id") == language.id
                            })
                        })
                        .and_then(|r| r.get::<Option<String>, _>(field));
                    // Match the native editor: legacy canonical source fields supply only
                    // the main locale; other missing fields still inherit without fabrication.
                    translated
                        .or_else(|| {
                            (locale.as_str() == settings.main_locale)
                                .then(|| source.map(|r| r.get::<String, _>(field)))
                                .flatten()
                        })
                        .is_some_and(|value| !value.trim().is_empty())
                })
                .cloned()
                .collect::<Vec<_>>()
        };
        let job = jobs
            .iter()
            .find(|r| r.get::<String, _>("product_id") == id)
            .map(|r| json!({"id":r.get::<String,_>("id"),"state":r.get::<String,_>("state")}));
        product["preparation"] = json!({
            "namedLocales":locales(false),"describedLocales":locales(true),
            "locales":settings.locales,"mainLocale":settings.main_locale,"imageJob":job
        });
    }
    Ok(())
}

//! Revision-bound category writes, bounded translations and serialized cycle-safe tree moves.
use super::*;
#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct Edit {
    revision: Option<i64>,
    parent_id: Option<String>,
    position: i32,
    data: Value,
}
pub(crate) fn input_schema(create: bool) -> Value {
    let mut fields = json!({
        "parentId":{"type":["string","null"]},
        "position":{"type":"integer"},
        "revision":{"type":"integer","minimum":1},
        "data":{"type":"object","required":["active","visible","type","translations"],"properties":{
            "active":{"type":"boolean"},"visible":{"type":"boolean"},
            "type":{"type":"string","enum":["page","folder","structuring","link"]},
            "translations":{"type":"object","description":"Content locale keys (for example en-GB), each containing name and optional description/slug. Include the shop main language."}
        }}
    });
    if create {
        fields["id"] = json!({"type":"string"});
    }
    json!({"type":"object","additionalProperties":false,"properties":fields,"required":if create {json!(["position","data"])} else {json!(["revision","position","data"])}})
}
fn parse(v: Value) -> Result<Edit> {
    let edit: Edit = serde_json::from_value(v).map_err(|_| bad("Invalid category edit"))?;
    validate(&edit)?;
    Ok(edit)
}
async fn configured(a: &App, t: &str, edit: &Edit) -> Result<()> {
    let (settings, _) = commerce::config(a, t).await?;
    graph_query::validate(&edit.data, &settings)?;
    let names: Value = edit.data["translations"]
        .as_object()
        .unwrap()
        .iter()
        .map(|(key, tr)| (key.clone(), tr["name"].clone()))
        .collect();
    commerce::validate_names(&names, &settings, 200)
}
/// Review uses the exact native DTO/data/language checks before creating executable work.
pub(crate) async fn admit_configuration(
    a: &App,
    t: &str,
    value: &Value,
    create: bool,
) -> Result<()> {
    let mut value = value.clone();
    if create {
        value
            .as_object_mut()
            .ok_or(bad("Invalid category edit"))?
            .remove("id");
    }
    configured(a, t, &parse(value)?).await
}
fn validate(v: &Edit) -> Result<()> {
    let d = &v.data;
    if !d.is_object()
        || d.to_string().len() > 16000
        || !d["active"].is_boolean()
        || !d["visible"].is_boolean()
        || !["page", "folder", "structuring", "link"].contains(&d["type"].as_str().unwrap_or(""))
    {
        return Err(bad("Invalid category data"));
    }
    if d.get("displayNestedProducts")
        .is_some_and(|v| !v.is_boolean())
    {
        return Err(bad("Invalid nested category listing flag"));
    }
    let translations = d["translations"]
        .as_object()
        .filter(|m| !m.is_empty() && m.len() <= 100)
        .ok_or(bad("Category translations required"))?;
    for (lang, tr) in translations {
        if !commerce::valid_locale_key(lang)
            || tr["name"]
                .as_str()
                .is_some_and(|s| s.is_empty() || s.len() > 200)
            || tr["description"].as_str().is_some_and(|s| s.len() > 4000)
            || tr["slug"]
                .as_str()
                .is_some_and(|s| s.len() > 200 || s.contains(['?', '#', '/']))
        {
            return Err(bad("Invalid category translation"));
        }
    }
    if d["type"] == "link"
        && !d["url"].as_str().is_some_and(|s| {
            reqwest::Url::parse(s).is_ok_and(|u| {
                u.scheme() == "https" && u.username().is_empty() && u.password().is_none()
            })
        })
    {
        return Err(bad("Category links require HTTPS"));
    }
    Ok(())
}
pub(crate) async fn list(State(a): State<App>, h: RequestContext) -> Result<Json<Value>> {
    auth::permit(&h, "catalog.read")?;
    let t = merchant(&a, &h)?;
    let rows =
        sqlx::query("SELECT * FROM categories WHERE tenant=$1 ORDER BY position,id LIMIT 2001")
            .bind(&t)
            .fetch_all(&a.db)
            .await?;
    if rows.len() > 2000 {
        return Err(bad("Category tree exceeds interactive limit"));
    }
    let (settings, _) = commerce::config(&a, &t).await?;
    Ok(Json(
        json!({"mainLocale":settings.main_locale,"elements":rows.iter().map(|r|json!({"id":r.get::<String,_>("id"),"parentId":r.get::<Option<String>,_>("parent_id"),"position":r.get::<i32,_>("position"),"revision":r.get::<i64,_>("revision"),"data":r.get::<Value,_>("data")})).collect::<Vec<_>>()}),
    ))
}
pub(crate) async fn import(a: App, h: RequestContext, id: String, v: Value) -> Result<Json<Value>> {
    write(a, h, id, v, true).await
}
pub(crate) async fn create(
    State(a): State<App>,
    h: RequestContext,
    Json(mut v): Json<Value>,
) -> Result<Json<Value>> {
    let id = match v.get("id") {
        None | Some(Value::Null) => Uuid::new_v4().to_string(),
        Some(Value::String(id)) if apps::identifier(id) || Uuid::parse_str(id).is_ok() => {
            id.clone()
        }
        _ => return Err(bad("Invalid category ID")),
    };
    v.as_object_mut()
        .ok_or(bad("Invalid category edit"))?
        .remove("id");
    write(a, h, id, v, true).await
}
pub(crate) async fn save(
    State(a): State<App>,
    h: RequestContext,
    Path(id): Path<String>,
    Json(v): Json<Value>,
) -> Result<Json<Value>> {
    write(a, h, id, v, false).await
}
async fn write(
    a: App,
    h: RequestContext,
    id: String,
    v: Value,
    create: bool,
) -> Result<Json<Value>> {
    auth::permit(&h, "catalog")?;
    let t = merchant(&a, &h)?;
    let v = parse(v)?;
    configured(&a, &t, &v).await?;
    let mut tx = a.db.begin().await?;
    history::context(&mut tx, &h, "merchant").await?;
    sqlx::query("SELECT pg_advisory_xact_lock(hashtextextended($1,726))")
        .bind(&t)
        .execute(&mut *tx)
        .await?;
    if let Some(parent) = &v.parent_id {
        let valid:bool=sqlx::query_scalar("WITH RECURSIVE ancestors AS (SELECT id,parent_id FROM categories WHERE tenant=$1 AND id=$2 UNION ALL SELECT c.id,c.parent_id FROM categories c JOIN ancestors x ON c.id=x.parent_id WHERE c.tenant=$1) SELECT EXISTS(SELECT 1 FROM ancestors) AND NOT EXISTS(SELECT 1 FROM ancestors WHERE id=$3)").bind(&t).bind(parent).bind(&id).fetch_one(&mut *tx).await?;
        if !valid {
            return Err(bad("Category parent is unavailable or creates a cycle"));
        }
    }
    let revision = if create {
        sqlx::query(
            "INSERT INTO categories(tenant,id,parent_id,position,data) VALUES($1,$2,$3,$4,$5)",
        )
        .bind(&t)
        .bind(&id)
        .bind(&v.parent_id)
        .bind(v.position)
        .bind(&v.data)
        .execute(&mut *tx)
        .await?;
        1
    } else {
        let rev = v.revision.ok_or(bad("Category revision required"))?;
        let n=sqlx::query("UPDATE categories SET parent_id=$1,position=$2,data=$3,revision=revision+1 WHERE tenant=$4 AND id=$5 AND revision=$6").bind(&v.parent_id).bind(v.position).bind(&v.data).bind(&t).bind(&id).bind(rev).execute(&mut *tx).await?.rows_affected();
        if n != 1 {
            return Err(conflict("Category changed"));
        }
        rev + 1
    };
    tx.commit().await?;
    Ok(Json(json!({"id":id,"revision":revision,"saved":true})))
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn validates_all_locales_and_links() {
        let mut d = json!({"active":false,"visible":true,"type":"page","translations":{}});
        for l in ["en", "de", "fr", "es"] {
            d["translations"][l] = json!({"name":"Catalog"});
        }
        let mut e = Edit {
            revision: None,
            parent_id: None,
            position: 0,
            data: d,
        };
        assert!(validate(&e).is_ok());
        e.data["type"] = json!("link");
        e.data["url"] = json!("javascript:alert(1)");
        assert!(validate(&e).is_err());
    }
}

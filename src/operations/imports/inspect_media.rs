//! Current immutable image bytes and the independently editable native media association are both inspected.
use super::*;
pub(super) async fn inspect(
    a: &App,
    h: &RequestContext,
    r: &SourceRecord,
    namespace: &str,
    id: &str,
) -> Result<(Value, Option<Value>)> {
    auth::permit(h, "catalog.read")?;
    let t = merchant(a, h)?;
    let product = relations::identity(
        r,
        namespace,
        "products",
        r.data["productSourceId"]
            .as_str()
            .ok_or(bad("Source product required"))?,
    )?;
    let mut actual=sqlx::query_scalar::<_,Value>("SELECT jsonb_build_object('productId',product_id,'digest',encode(sha256(content),'hex'),'byteLength',octet_length(content),'mime',mime,'filename',filename,'title',title,'public',public) FROM product_assets WHERE tenant=$1 AND id=$2").bind(&t).bind(id).fetch_optional(&a.db).await?;
    if let Some(value) = &mut actual {
        let media: Option<Value> =
            sqlx::query_scalar("SELECT media FROM products WHERE tenant=$1 AND id=$2")
                .bind(&t)
                .bind(&product)
                .fetch_optional(&a.db)
                .await?;
        value["association"] = media
            .and_then(|xs| {
                xs.as_array()
                    .and_then(|xs| xs.iter().find(|x| x["id"] == id).cloned())
            })
            .unwrap_or(Value::Null);
    }
    let group = hash(&json!([r.source, r.source_shop, r.data["productSourceId"]]).to_string());
    let expected = json!({"productId":product,"digest":r.data["digest"],"byteLength":r.data["byteLength"],"mime":r.data["mime"],"filename":r.data["filename"],"title":r.data["title"],"public":true,"association":{"id":id,"url":format!("/store-api/assets/{id}?shop={t}"),"alt":r.data["title"],"importGroup":group,"importPosition":r.data["position"]}});
    Ok((expected, actual))
}

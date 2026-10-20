//! Explicit merchant preferences reuse versioned private sources; quoted guidance never expands native authority.
use super::*;
pub(super) fn admit(h: &RequestContext, kind: &Value) -> Result<()> {
    if kind == "guidance" && (!h.principal.personal_session || h.principal.app.is_some()) {
        return Err(Error(
            StatusCode::FORBIDDEN,
            "Remembered guidance requires a personal merchant decision".into(),
        ));
    }
    Ok(())
}
pub(crate) async fn current(a: &App, t: &str, locale: &str) -> Result<Value> {
    let rows: Vec<Value> = sqlx::query_scalar("SELECT jsonb_build_object('documentId',d.id,'sourceId',d.id||':'||c.position,'title',d.title,'productId',d.product_id,'contentHash',d.content_hash,'revision',d.revision,'locale',c.locale,'text',c.text) FROM knowledge_documents d JOIN knowledge_chunks c ON c.tenant=d.tenant AND c.document_id=d.id WHERE d.tenant=$1 AND d.kind='guidance' AND d.visibility='private' AND NOT d.archived AND d.product_id IS NULL AND c.locale=CASE WHEN jsonb_typeof(d.translations->$2->'content')='string' THEN $2 ELSE d.locale END ORDER BY d.id,c.position LIMIT 8").bind(t).bind(locale).fetch_all(&a.db).await?;
    Ok(json!(rows))
}

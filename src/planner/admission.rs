//! Every initial or repaired model proposal traverses the same native read-only admission.
use super::*;
pub(super) async fn admit(
    a: &App,
    t: &str,
    authority: &RequestContext,
    prepared: &Value,
    locale: &str,
    candidate: &Value,
) -> Result<(Proposal, Vec<Product>, i64)> {
    let mut ps: Vec<Product> = serde_json::from_value(prepared["products"].clone())
        .map_err(|_| bad("Invalid saved agent context"))?;
    let (commerce_settings, _) = commerce::config(a, t).await?;
    let mut p: Proposal = serde_json::from_value(candidate.clone())
        .map_err(|e| bad(format!("Invalid model proposal: {e}")))?;
    if p.view.is_some()
        && (!p.operations.is_empty()
            || !p.changes.is_empty()
            || p.app_action.is_some()
            || p.experience.is_some()
            || p.translation.is_some())
    {
        return Err(bad("Review list views separately from mutations"));
    }
    if let Some(view) = &mut p.view {
        agent_runs::view::admit(a, authority, view).await?;
    }
    if !p.operations.is_empty() {
        if !p.changes.is_empty()
            || p.app_action.is_some()
            || p.experience.is_some()
            || p.translation.is_some()
        {
            return Err(bad(
                "Review native work separately from legacy commerce changes",
            ));
        }
        agent_runs::work_plan::bind(a, t, authority, &mut p.operations).await?;
    }
    // Read tools may discover another requested SKU; only hydrate its current owning-tenant row.
    let requested = p
        .changes
        .iter()
        .map(|c| c.product_id.clone())
        .collect::<Vec<_>>();
    if requested.len() > 100 {
        return Err(bad("Proposal product budget exceeded"));
    }
    for row in
        sqlx::query("SELECT * FROM products WHERE tenant=$1 AND id=ANY($2) ORDER BY id LIMIT 100")
            .bind(t)
            .bind(&requested)
            .fetch_all(&a.db)
            .await?
    {
        let item = product(&row);
        if !ps.iter().any(|p| p.id == item.id) {
            ps.push(item);
        }
    }
    if let Some(change) = &mut p.app_action {
        apps::bind_change(a, t, change, authority).await?;
    }
    // Concurrency tokens are trusted state, never facts invented by the model.
    for c in &mut p.changes {
        let before = ps
            .iter()
            .find(|p| p.id == c.product_id)
            .ok_or(bad("Unknown product in plan"))?;
        c.expected_revision = before.revision;
        if c.price == Some(before.price) {
            c.price = None;
        }
        if c.stock == Some(before.stock) {
            c.stock = None;
        }
    }
    p.changes.retain(|c| c.price.is_some() || c.stock.is_some());
    if p.experience.as_ref() == Some(&prepared["experience"].clone()) {
        p.experience = None;
        p.expected_experience_revision = None;
    } else if p.experience.is_some() {
        p.expected_experience_revision = Some(prepared["experienceRevision"].as_i64().unwrap());
    }
    if let Some(experience) = p.experience.as_mut() {
        experience["headlineLocale"] = json!(locale);
    }
    if p.translation.as_ref().is_some_and(|l| {
        !commerce_settings.locales.contains(l) || *l == commerce_settings.main_locale
    }) {
        return Err(bad("Select an enabled translation target"));
    }
    if let Some(ids) = &p.translation_products {
        let mut tx = a.db.begin().await?;
        translations::selection::admit(&mut tx, t, Some(ids)).await?;
    }
    validate_proposal(&p, &ps)?;
    let policy_revision = cognition::guardrails::validate_plan(a, t, &p, &ps).await?;
    Ok((p, ps, policy_revision))
}

//! Merchant readiness reports native implementation and current channel configuration, never external programme approval or settlement.
use super::*;
pub(crate) async fn readiness(a: &App, h: &RequestContext) -> Result<Value> {
    let t = merchant(a, h)?;
    auth::permit(h, "catalog.read")?;
    let channel = marketing::channel_id(h);
    let (settings, revision) = commerce::scoped_config(a, &t, channel).await?;
    marketing::channel(a, h, channel, &settings.main_locale).await?;
    Ok(
        json!({"destination":"veyndo","channel":channel,"settingsRevision":revision,"cartTransfer":true,"buyerConsent":true,"externalAcceptance":"not_verified","private":staging::parent(a,&t).await?.is_some(),"configuredPayments":settings.payments.iter().filter(|p|p.active).map(|p|json!({"id":p.id,"mode":p.mode})).collect::<Vec<_>>(),"profilePath":"/.well-known/ucp","cartPath":"/ucp/v1/carts","inboundSources":["csv","shopify_csv","shop_mcp","url"]}),
    )
}

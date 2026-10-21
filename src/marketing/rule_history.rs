//! Side-effect-free rule comparison on bounded, tenant-owned frozen Flow order inputs.
use super::*;
pub(crate) const HISTORY_CAPABILITIES: &[(&str, &str)] = &[(
    "automation.compare_history",
    "Compare a saved rule and draft on frozen order.placed Flow inputs without replaying actions or reading current commerce data",
)];

const SCOPES: &[&str] = &[
    "automation.read",
    "orders.read",
    "catalog.read",
    "customers.read",
    "customers.pii",
    "payments.read",
    "documents.read",
    "b2b.read",
];

pub(super) fn visible(h: &RequestContext) -> bool {
    SCOPES.iter().all(|scope| auth::allowed(h, scope))
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct Input {
    rule_id: String,
    revision: i64,
    flow_id: String,
    condition: rules::Condition,
    limit: u32,
}

pub(super) async fn compare(
    State(a): State<App>,
    h: RequestContext,
    Json(v): Json<Value>,
) -> Result<Json<Value>> {
    let t = merchant(&a, &h)?;
    for scope in SCOPES {
        auth::permit(&h, scope)?;
    }
    if v.to_string().len() > 32_768 {
        return Err(bad("Rule comparison exceeds 32 KiB"));
    }
    let input: Input = serde_json::from_value(v).map_err(|_| bad("Invalid rule comparison"))?;
    if !apps::identifier(&input.rule_id)
        || !apps::identifier(&input.flow_id)
        || input.revision < 1
        || !(1..=50).contains(&input.limit)
    {
        return Err(bad("Saved rule, Flow, revision and limit (1–50) required"));
    }
    input.condition.validate(0)?;
    let row = sqlx::query(
        "SELECT condition,revision,active FROM commerce_rules WHERE tenant=$1 AND id=$2",
    )
    .bind(&t)
    .bind(&input.rule_id)
    .fetch_optional(&a.db)
    .await?
    .ok_or(Error(StatusCode::NOT_FOUND, "Rule unavailable".into()))?;
    if row.get::<i64, _>("revision") != input.revision {
        return Err(conflict("Configuration revision changed"));
    }
    let baseline: rules::Condition =
        serde_json::from_value(row.get("condition")).map_err(|_| bad("Invalid saved rule"))?;
    baseline.validate(0)?;
    // Existing (tenant,flow,event_id) index bounds the sample. Never fetch current carts,
    // products/customers/references or dispatch any Flow action during comparison.
    let rows = sqlx::query("SELECT id,event_id,CASE WHEN octet_length(definition::text)<=262144 THEN definition ELSE NULL END AS snapshot FROM flow_jobs WHERE tenant=$1 AND flow=$2 ORDER BY event_id DESC LIMIT $3")
        .bind(&t).bind(&input.flow_id).bind(i64::from(input.limit)).fetch_all(&a.db).await?;
    let results: Vec<Value> = rows
        .iter()
        .map(|r| {
            let snapshot: Option<Value> = r.get("snapshot");
            let mut result = match snapshot {
                Some(d) => evaluate(&t, &d, &baseline, &input.condition),
                None => json!({"status":"unavailable","reason":"snapshot_too_large"}),
            };
            result["jobId"] = json!(r.get::<String, _>("id"));
            result["eventId"] = json!(r.get::<i64, _>("event_id"));
            result
        })
        .collect();
    let evaluated = results
        .iter()
        .filter(|r| r["status"] == "evaluated")
        .count();
    let changed = results
        .iter()
        .filter(|r| r["status"] == "evaluated" && r["before"] != r["after"])
        .count();
    Ok(Json(
        json!({"sideEffects":false,"comparisonVersion":1,"ruleId":input.rule_id,
        "revision":input.revision,"baselineActive":row.get::<bool,_>("active"),"flowId":input.flow_id,
        "baselineDigest":digest(&json!(baseline)),"candidateDigest":digest(&json!(input.condition)),
        "sampled":results.len(),"evaluated":evaluated,"changed":changed,
        "unavailable":results.len()-evaluated,"results":results}),
    ))
}

fn digest(v: &Value) -> String {
    use sha2::Digest;
    format!("{:x}", sha2::Sha256::digest(v.to_string().as_bytes()))
}

fn evaluate(t: &str, d: &Value, before: &rules::Condition, after: &rules::Condition) -> Value {
    let unavailable = |reason| json!({"status":"unavailable","reason":reason});
    if d["event"] != "order.placed" {
        return unavailable("not_order_placed");
    }
    let q = &d["ruleContext"];
    if !q["ruleFacts"].is_object()
        || !q["price"]["totalPrice"].is_number()
        || !q["lineItems"].is_array()
        || !q["ruleFacts"]["currentTime"].is_string()
        || d["orderId"].as_str().is_none_or(str::is_empty)
    {
        return unavailable("incomplete_snapshot");
    }
    let Ok(data) = serde_json::from_value::<Cart>(d["cartData"].clone()) else {
        return unavailable("incomplete_snapshot");
    };
    let cart = StoredCart {
        id: String::new(),
        tenant: t.into(),
        token: String::new(),
        data,
        revision: 0,
        status: "frozen_comparison".into(),
    };
    if !bounded(before, q, 0, &mut 2048) || !bounded(after, q, 0, &mut 2048) {
        return unavailable("required_facts_unavailable");
    }
    // Native interpreter fails closed for missing referenced rules/source facts,
    // including under NOT. Never return raw errors or frozen personal data.
    match (
        before.checked_matches(&cart, q),
        after.checked_matches(&cart, q),
    ) {
        (Ok(a), Ok(b)) => json!({"status":"evaluated","before":a,"after":b,
            "capturedAt":q["ruleFacts"]["currentTime"],
            "snapshotDigest":digest(&json!({"cartData":d["cartData"],"ruleContext":q}))}),
        _ => unavailable("required_facts_unavailable"),
    }
}

// Bound expanded reference work, not just distinct rules: a small shared graph
// can otherwise fan out exponentially. This guard never decides a rule's result.
fn bounded(c: &rules::Condition, q: &Value, depth: usize, remaining: &mut usize) -> bool {
    if depth > 8 || *remaining == 0 {
        return false;
    }
    *remaining -= 1;
    match c {
        rules::Condition::And { children } | rules::Condition::Or { children } => children
            .iter()
            .all(|child| bounded(child, q, depth + 1, remaining)),
        rules::Condition::Not { child } => bounded(child, q, depth + 1, remaining),
        rules::Condition::Reference { rule_id } => serde_json::from_value::<rules::Condition>(
            q["ruleFacts"]["rules"][rule_id]["condition"].clone(),
        )
        .is_ok_and(|rule| rule.validate(0).is_ok() && bounded(&rule, q, depth + 1, remaining)),
        _ => true,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn shared_reference_fanout_is_bounded_before_interpretation() {
        let mut q = json!({"ruleFacts":{"rules":{}}});
        for n in 0..3 {
            let child = if n == 2 {
                json!({"type":"alwaysValid"})
            } else {
                json!({"type":"ruleReference","ruleId":format!("r{}",n+1)})
            };
            q["ruleFacts"]["rules"][format!("r{n}")] = json!({"active":true,
                "condition":{"type":"andContainer","children":vec![child;16]}});
        }
        let condition = rules::Condition::Reference {
            rule_id: "r0".into(),
        };
        let mut remaining = 2048;
        assert!(!bounded(&condition, &q, 0, &mut remaining));
        assert_eq!(remaining, 0);
    }
    #[test]
    fn absent_reference_under_negation_never_becomes_a_match() {
        let condition = rules::Condition::Not {
            child: Box::new(rules::Condition::Reference {
                rule_id: "missing".into(),
            }),
        };
        assert!(!bounded(&condition, &json!({}), 0, &mut 2048));
        assert!(bounded(&rules::Condition::Always, &json!({}), 0, &mut 2048));
    }
}

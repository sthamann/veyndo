//! Bounded copies of reviewed native work: event values replace explicit scalar fields, never executable text.
use super::*;

#[derive(Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct WorkTemplate {
    pub task_id: String,
    #[serde(default)]
    pub bindings: Vec<Binding>,
    pub daily_limit: u32,
}

#[derive(Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct Binding {
    pub step: usize,
    pub pointer: String,
    pub source: String,
}

impl WorkTemplate {
    pub(crate) fn validate(&self) -> Result<()> {
        if self.task_id.is_empty()
            || !self
                .task_id
                .bytes()
                .all(|c| c.is_ascii_alphanumeric() || matches!(c, b'_' | b'-'))
            || self.task_id.len() > 64
            || json!(self).to_string().len() > 16384
            || self.bindings.len() > 48
            || !(1..=100).contains(&self.daily_limit)
        {
            return Err(bad(
                "Work template needs a saved task, at most 48 bindings, 16 KiB and a daily limit of 1..100",
            ));
        }
        let mut targets = std::collections::HashSet::new();
        for binding in &self.bindings {
            let source = binding.source.as_str();
            let generated = source
                .strip_prefix("run.key:")
                .is_some_and(apps::identifier);
            if !generated
                && ![
                    "event.productId",
                    "event.revision",
                    "event.orderId",
                    "event.documentId",
                ]
                .contains(&source)
            {
                return Err(bad("Unsupported work template source"));
            }
            if binding.pointer.is_empty()
                || binding.pointer.len() > 300
                || !targets.insert((binding.step, &binding.pointer))
                || binding.step >= 12
            {
                return Err(bad(
                    "Map each work template input to one existing text or number field",
                ));
            }
        }
        Ok(())
    }

    pub(crate) fn resolve(
        &self,
        mut steps: Vec<agent_runs::work_plan::Step>,
        job: &str,
        definition: &Value,
    ) -> Result<Vec<agent_runs::work_plan::Step>> {
        self.validate()?;
        for binding in &self.bindings {
            let args: Value = serde_json::from_str(
                &steps
                    .get(binding.step)
                    .ok_or(bad("Template step does not exist"))?
                    .arguments_json,
            )
            .map_err(|_| bad("Invalid template arguments"))?;
            if args
                .pointer(&binding.pointer)
                .is_none_or(|v| !v.is_string() && !v.is_number())
            {
                return Err(bad("Template field must be existing text or a number"));
            }
        }
        for (index, step) in steps.iter_mut().enumerate() {
            let mut args: Value = serde_json::from_str(&step.arguments_json)
                .map_err(|_| bad("Invalid template arguments"))?;
            for binding in self.bindings.iter().filter(|b| b.step == index) {
                let value = if let Some(key) = binding.source.strip_prefix("run.key:") {
                    json!(format!("work_{}", &hash(&format!("{job}:{key}"))[..24]))
                } else {
                    let key = binding.source.strip_prefix("event.").unwrap();
                    let value = definition["eventContext"][key].clone();
                    if key == "revision" {
                        if value.as_i64().is_none_or(|v| v < 0) {
                            return Err(bad("Event has no valid revision for this template"));
                        }
                    } else if value.as_str().is_none_or(|v| v.is_empty() || v.len() > 160) {
                        return Err(bad(format!("Event has no {key} for this template")));
                    }
                    value
                };
                let target = args
                    .pointer_mut(&binding.pointer)
                    .ok_or(bad("Template target disappeared"))?;
                if target.is_string() != value.is_string()
                    || target.is_number() != value.is_number()
                {
                    return Err(bad("Event value type does not match template input"));
                }
                *target = value;
            }
            step.arguments_json = args.to_string();
        }
        Ok(steps)
    }
}

pub(crate) async fn prepare(
    a: &App,
    t: &str,
    f: &flows::Flow,
    job: &str,
    template: &WorkTemplate,
    definition: &Value,
) -> Result<Value> {
    let h = super::flow_access::proposal_headers(a, t, f.actor.as_deref(), job).await?;
    let steps = {
        let mut tx = a.db.begin().await?;
        super::work_template_source::load(&mut tx, t, &h, template).await?
    };
    let mut steps = template.resolve(steps, job, definition)?;
    // Native owners validate current tenant, schema, package, rights and original
    // revisions. A copy never refreshes an obsolete revision behind the review.
    agent_runs::work_plan::bind(a, t, &h, &mut steps).await?;
    let (settings, _) = commerce::config(a, t).await?;
    let instruction =
        super::flow_text::effective(&json!(f.instruction), &f.locale, &settings.main_locale)
            .to_owned();
    let id = uid();
    let evidence = json!({"instruction":instruction,"locale":f.locale,"actor":f.actor,"model":null,"inference":null,"catalogBefore":[],"applied":false,"flowTemplateLimit":template.daily_limit,"proposal":{"summary":instruction,"changes":[],"operations":steps},"templateSource":{"taskId":template.task_id,"flowJob":job,"bindings":template.bindings}});
    agent_runs::persist(a, t, &id, &evidence, &h).await?;
    Ok(json!({"taskId":id,"preview":evidence,"approvalRequired":true}))
}

#[cfg(test)]
mod tests {
    use super::*;
    fn template(bindings: Value) -> WorkTemplate {
        serde_json::from_value(json!({"taskId":"12abc", "dailyLimit":2,"bindings":bindings}))
            .unwrap()
    }
    fn steps() -> Vec<agent_runs::work_plan::Step> {
        vec![serde_json::from_value(json!({"name":"merchant.product.save","label":"Edit","arguments_json":"{\"id\":\"original\",\"parent\":\"original\",\"revision\":3,\"text\":\"{event.productId}\"}"})).unwrap()]
    }
    #[test]
    fn event_mapping_is_typed_and_never_interpolates_unselected_text() {
        let t = template(
            json!([{"step":0,"pointer":"/id","source":"event.productId"},{"step":0,"pointer":"/revision","source":"event.revision"}]),
        );
        let out = t
            .resolve(
                steps(),
                "job",
                &json!({"eventContext":{"productId":"target","revision":5}}),
            )
            .unwrap();
        let args: Value = serde_json::from_str(&out[0].arguments_json).unwrap();
        assert_eq!(
            args,
            json!({"id":"target","parent":"original","revision":5,"text":"{event.productId}"})
        );
        assert!(
            t.resolve(
                steps(),
                "job",
                &json!({"eventContext":{"productId":"target","revision":"5"}})
            )
            .is_err()
        );
        assert!(t.resolve(steps(), "job", &json!({})).is_err());
    }
    #[test]
    fn generated_references_are_stable_within_one_event_and_distinct_between_events() {
        let t = template(
            json!([{"step":0,"pointer":"/id","source":"run.key:product"},{"step":0,"pointer":"/parent","source":"run.key:product"}]),
        );
        let a = t.resolve(steps(), "one", &json!({})).unwrap();
        let b = t.resolve(steps(), "one", &json!({})).unwrap();
        let c = t.resolve(steps(), "two", &json!({})).unwrap();
        assert_eq!(a[0].arguments_json, b[0].arguments_json);
        assert_ne!(a[0].arguments_json, c[0].arguments_json);
        let args: Value = serde_json::from_str(&a[0].arguments_json).unwrap();
        assert_eq!(args["id"], args["parent"]);
    }
    #[test]
    fn malformed_duplicate_and_unknown_mappings_fail_closed() {
        for bindings in [
            json!([{"step":0,"pointer":"/id","source":"event.cookie"}]),
            json!([{"step":12,"pointer":"/id","source":"event.productId"}]),
            json!([{"step":0,"pointer":"/id","source":"event.productId"},{"step":0,"pointer":"/id","source":"run.key:other"}]),
        ] {
            assert!(template(bindings).validate().is_err());
        }
        let t = template(json!([{"step":0,"pointer":"/absent","source":"event.productId"}]));
        assert!(
            t.resolve(
                steps(),
                "job",
                &json!({"eventContext":{"productId":"target"}})
            )
            .is_err()
        );
        let mut t = template(json!([]));
        t.daily_limit = 0;
        assert!(t.validate().is_err());
    }
}

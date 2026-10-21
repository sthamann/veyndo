//! App-owned nested page format shared by merchant planning and external coding agents.
use super::*;

pub(crate) fn contract() -> Value {
    json!({
        "slug":"1–100 lowercase ASCII letters, digits or hyphens",
        "content":{
            "blocks":{
                "maxItems":24,
                "required":["id","kind"],
                "additionalProperties":false,
                "properties":{
                    "id":"unique within page; ^[a-z][a-z0-9_]{0,31}$; underscores allowed, hyphens not allowed",
                    "kind":["hero","text","products","image","form","articles","app"],
                    "text":"optional locale-to-string/null map; enabled shop locale keys (e.g. it-IT), at most 100 locales, 2000 UTF-8 bytes per value; null means inherit",
                    "rich":"optional locale-to-array map (not Tiptap root directly), at most 100 locales and 40 blocks per locale; basic blocks are {type:paragraph/heading/list,text:string} (max 4000 UTF-8 bytes); media blocks are {type:image/video,url:HTTPS}; omit when plain text suffices",
                    "image":"optional owned public product-media path or HTTPS URL; omit if unavailable",
                    "products":"optional array of at most 24 product IDs from the current shop/channel; each ID at most 100 bytes",
                    "productMode":["all","selected"],
                    "fields":"optional array of at most 12 form fields: {id,kind,required:boolean,label:locale-to-string map}; id unique in block matching ^[a-z][a-z0-9_]{0,31}$; kind text/email/textarea/checkbox/number; label 1–100 enabled locales, max 100 UTF-8 bytes per label",
                    "extension":"only kind=app requires {app,surface}, both identifiers matching ^[a-z][a-z0-9_]{0,31}$; installed enabled app other than site_builder; omit for all other kinds"
                }
            }
        },
        "theme":{"optionalProperties":{"accent":"#RRGGBB","background":"#RRGGBB","foreground":"#RRGGBB","font":["sans","serif","mono"],"radius":"integer 0..32","spacing":"integer 12..96","columns":"integer 1..4"},"additionalProperties":false},
        "example":{"content":{"blocks":[{"id":"collection_intro","kind":"hero","text":{"it-IT":"La nostra collezione"}},{"id":"selected_products","kind":"products","products":["replace_with_observed_product_id"],"productMode":"selected"}]},"theme":{}},
        "selection":"Use only observed shop/channel/product IDs and enabled locales. Examples show shape, not permission to invent IDs or translations. Preserve fields not requested. Saving a page never publishes the sandbox."
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn contract_example_passes_native_shape_admission() {
        let mut page = contract()["example"].clone();
        page["slug"] = json!("collection");
        assert!(super::super::validate("pages", &page).is_ok());
    }

    #[test]
    fn rejected_block_identifies_field_without_echoing_payload() {
        let mut page = json!({"slug":"collection","theme":{},"content":{"blocks":[{"id":"hero-it","kind":"hero","text":{"it-IT":"Collezione"}}]}});
        let error = super::super::validate("pages", &page).unwrap_err();
        assert!(error.1.starts_with("content.blocks[0].id:"));
        assert!(!error.1.contains("hero-it"));
        page["content"]["blocks"][0]["id"] = json!("hero_it");
        assert!(super::super::validate("pages", &page).is_ok());
        let duplicate = page["content"]["blocks"][0].clone();
        page["content"]["blocks"]
            .as_array_mut()
            .unwrap()
            .push(duplicate);
        assert!(
            super::super::validate("pages", &page)
                .unwrap_err()
                .1
                .starts_with("content.blocks[1].id:")
        );
    }

    #[test]
    fn block_constraints_remain_enforced_with_specific_paths() {
        let base = json!({"slug":"collection","theme":{},"content":{"blocks":[{"id":"content","kind":"text"}]}});
        let cases = [
            ("kind", json!("script")),
            ("extension", json!({"app":"other","surface":"banner"})),
            ("text", json!({"it-IT":"x".repeat(2001)})),
            ("productMode", json!("automatic")),
            ("products", json!(vec!["p"; 25])),
            (
                "rich",
                json!({"it-IT":[{"type":"image","url":"javascript:alert(1)"}]}),
            ),
            ("image", json!("javascript:alert(1)")),
            (
                "fields",
                json!(vec![
                    json!({"id":"a","kind":"text","required":false,"label":{"it-IT":"A"}});
                    13
                ]),
            ),
        ];
        for (field, value) in cases {
            let mut page = base.clone();
            page["content"]["blocks"][0][field] = value;
            let error = super::super::validate("pages", &page).unwrap_err();
            assert!(
                error.1.starts_with(&format!("content.blocks[0].{field}:")),
                "{}",
                error.1
            );
        }
    }
}

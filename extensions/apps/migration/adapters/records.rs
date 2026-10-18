//! Historical facts remain source claims, without synthesized account, payment, consent or verified-purchase authority.
use super::*;
pub fn normalize(c: &Context, kind: &str, v: &Value) -> Result<Record> {
    let source_id = id(v, &["id", "entity_id", "id_order", "code"])?;
    let mut data = match kind {
        "orders" => {
            let currency = text(&field(v, &["currency", "order_currency_code"]));
            if !currency.is_empty() && currency != c.currency {
                return Err("order currency differs from selected source currency".into());
            }
            let total = c.money(&field(
                v,
                &[
                    "total_price",
                    "total",
                    "grand_total",
                    "total_paid",
                    "invoiceAmount",
                ],
            ))?;
            let created = super::dates::created(c, v)?;
            json!({"number":field(v,&["name","number","increment_id","reference"]),"total":total,"totalDisplay":total.decimal(),"sourcePaymentStatus":field(v,&["financial_status","status","current_state","paymentStatusId"]),"sourceOrderStatus":field(v,&["fulfillment_status","status","state","orderStatusId"]),"createdAt":created,"lines":super::order_lines::lines(c,v)?,"customerSourceId":field(v,&["customer.id","customer_id","id_customer","customerId"]),"billingAddress":super::contacts::address(&field(v,&["billing_address","billing","billingAddress"]),"",""),"shippingAddress":super::contacts::address(&field(v,&["shipping_address","shipping","shippingAddress"]),"",""),"historical":true})
        }
        "customers" => {
            json!({"email":field(v,&["email"]),"firstName":field(v,&["first_name","firstname","profile.firstname"]),"lastName":field(v,&["last_name","lastname","profile.lastname"]),"billingAddress":super::contacts::customer_address(v,&text(&field(v,&["first_name","firstname","profile.firstname"])),&text(&field(v,&["last_name","lastname","profile.lastname"]))),"sourceGroup":field(v,&["group_id","id_default_group","groupKey"]),"consentEvidence":Value::Null,"credentialMigrated":false})
        }
        "pages" | "categories" => {
            let p = text(&field(v, &["parent", "parent_id", "id_parent"]));
            let parent = if p.is_empty() || p == "0" {
                Value::Null
            } else {
                json!(p)
            };
            json!({"title":translated(c,&field(v,&["title.rendered","title","name"]))?,"body":translated(c,&field(v,&["body_html","content.rendered","content","description"]))?,"slug":translated(c,&field(v,&["handle","slug","identifier","link_rewrite"]))?,"parentSourceId":parent})
        }
        "reviews" => {
            json!({"productSourceId":field(v,&["product_id","entity_pk_value","id_product","articleId"]),"text":field(v,&["review","detail","content"]),"rating":field(v,&["rating","grade","points"]),"sourceAuthor":field(v,&["reviewer","nickname","customer"]),"createdAt":field(v,&["date_created_gmt","created_at","date_add"]),"sourceVerified":field(v,&["verified","verified_purchase"]),"verifiedPurchase":false})
        }
        "coupons" => {
            json!({"code":field(v,&["code","name"]),"amount":field(v,&["amount","reduction_amount","discount_amount"]),"discountType":field(v,&["discount_type","simple_action"]),"expiresAt":field(v,&["date_expires_gmt","date_to","to_date"]),"sourceRules":v,"activationReviewed":false})
        }
        "branding" | "redirects" => v.clone(),
        _ => return Err("unsupported source domain; no records were silently discarded".into()),
    };
    if kind == "pages" {
        data["destination"] = super::pages::destination(c, &data)?;
    }
    Record::new(c, kind, source_id, data)
}

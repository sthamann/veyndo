-- Successive authenticated carts share one revocable receipt; no session-only lookup.
ALTER TABLE privacy_consents ADD COLUMN source_cart_id text;
ALTER TABLE privacy_consents ADD CONSTRAINT privacy_consents_source_scope
 FOREIGN KEY (tenant,source_cart_id,channel_id)
 REFERENCES privacy_consents(tenant,cart_id,channel_id);
ALTER TABLE privacy_consents ADD CONSTRAINT privacy_consents_source_distinct
 CHECK (source_cart_id IS NULL OR source_cart_id <> cart_id);
CREATE INDEX privacy_consents_source ON privacy_consents(tenant,source_cart_id,channel_id)
 WHERE source_cart_id IS NOT NULL;

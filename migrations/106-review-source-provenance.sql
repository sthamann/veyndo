-- Review migration adds bounded provenance to the original native table, never a purchase/account binding.
ALTER TABLE product_reviews ADD COLUMN source_import jsonb;
ALTER TABLE product_reviews ADD CONSTRAINT review_source_provenance CHECK (
 source_import IS NULL OR (jsonb_typeof(source_import)='object' AND octet_length(source_import::text)<=8192 AND NOT verified)
);

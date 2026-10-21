-- Freeze an explicitly reviewed collection in the existing translation queue; NULL retains whole-catalogue traversal.
ALTER TABLE translation_jobs ADD COLUMN product_ids text[];
ALTER TABLE translation_jobs ADD COLUMN run_task text;
ALTER TABLE translation_jobs ADD CONSTRAINT translation_run_tenant_fk
 FOREIGN KEY(tenant,run_task) REFERENCES tasks(tenant,id);
CREATE INDEX translation_jobs_run ON translation_jobs(tenant,run_task) WHERE run_task IS NOT NULL;
ALTER TABLE tasks ADD COLUMN run_after timestamptz NOT NULL DEFAULT now();
ALTER TABLE translation_jobs ADD CONSTRAINT translation_selection_budget CHECK (
 product_ids IS NULL OR (cardinality(product_ids) BETWEEN 1 AND 1000 AND array_position(product_ids, NULL) IS NULL)
);

ALTER TABLE translation_items ADD COLUMN evidence jsonb;
ALTER TABLE translation_items ADD CONSTRAINT translation_evidence_budget CHECK (
 evidence IS NULL OR (jsonb_typeof(evidence)='object' AND octet_length(evidence::text)<=8192)
);

ALTER TABLE translation_jobs ADD COLUMN error_code text CHECK (error_code IS NULL OR error_code='call_interrupted');

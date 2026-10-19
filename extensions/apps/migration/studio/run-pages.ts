/** Durable page intents use native app records/CAS; they never replace current per-page import admission. */
import type { RequestFn } from "../../../../frontend/src/shared/api/types";
import { domains, type RunPlan } from "./run-model";
import type { Kind, Job } from "./model";
export type Batch = {
  id: string;
  revision: number;
  run_id: string;
  source_id: string;
  kind: Kind;
  target: string;
  cursor?: string;
  next_cursor?: string;
  digests: string[];
  options: Record<string, unknown>;
  state: "reviewed" | "matching" | "differences";
  result?: NonNullable<Job["result"]>;
  job_id?: string;
  verified?: boolean;
};
export function readBatch(value: unknown): Batch | undefined {
  if (!value || typeof value !== "object") return;
  const b = value as Batch;
  if (
    typeof b.id !== "string" ||
    !Number.isSafeInteger(b.revision) ||
    b.revision < 1 ||
    typeof b.run_id !== "string" ||
    typeof b.source_id !== "string" ||
    !domains.includes(b.kind) ||
    typeof b.target !== "string" ||
    !Array.isArray(b.digests) ||
    b.digests.length > 100 ||
    !b.digests.every(
      (d) => typeof d === "string" && /^[a-f0-9]{64}$/.test(d),
    ) ||
    !b.options ||
    typeof b.options !== "object" ||
    Array.isArray(b.options) ||
    !["reviewed", "matching", "differences"].includes(b.state) ||
    (b.cursor != null && typeof b.cursor !== "string") ||
    (b.next_cursor != null && typeof b.next_cursor !== "string")
  )
    return;
  return b;
}
export async function savePage(
  request: RequestFn,
  plan: RunPlan,
  kind: Kind,
  target: string,
  cursor: string | undefined,
  digests: string[],
  options: Record<string, unknown>,
  current: () => boolean = () => true,
) {
  const identity = JSON.stringify([
    plan.id,
    plan.source_id,
    kind,
    target,
    cursor ?? "",
  ]);
  const hash = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(identity),
  );
  if (!current()) return;
  const id = Array.from(new Uint8Array(hash), (n) =>
    n.toString(16).padStart(2, "0"),
  ).join("");
  const rows = await request("/api/apps/migration/actions/list_batches", {
    id,
    limit: 1,
  });
  if (!current()) return;
  const candidate = readBatch(rows.elements?.[0]);
  const prior =
    candidate?.id === id &&
    candidate.run_id === plan.id &&
    candidate.source_id === plan.source_id &&
    candidate.kind === kind
      ? candidate
      : undefined;
  const fields = {
    run_id: plan.id,
    source_id: plan.source_id,
    kind,
    target,
    cursor: cursor ?? "",
    next_cursor: "",
    digests,
    options,
    state: "reviewed",
    result: {},
    job_id: "",
  };
  const saved = await request("/api/apps/migration/actions/save_batch", {
    id,
    revision: prior?.revision ?? 0,
    fields,
  });
  return {
    batchId: id,
    batchRevision: saved.revision,
    evidenceRecord: { entity: "batches", id },
  };
}
export function pageIntent(batch: Batch, operation: "import" | "reconcile") {
  return {
    jobGroup: batch.run_id,
    sourceId: batch.source_id,
    kind: batch.kind,
    target: batch.target,
    recordDigests: batch.digests,
    options: batch.options,
    ...(batch.cursor ? { cursor: batch.cursor } : {}),
    batchId: batch.id,
    batchRevision: batch.revision,
    operation,
    evidenceRecord: { entity: "batches", id: batch.id },
  };
}
export function nextPage(plan: RunPlan, batches: Batch[]) {
  let completed = 0;
  for (const kind of domains.filter((k) => plan.domains.includes(k))) {
    let cursor = "";
    const seen = new Set<string>();
    for (;;) {
      if (seen.has(cursor)) return { completed, kind, cursor, blocked: true };
      seen.add(cursor);
      const page = batches.find(
        (b) =>
          b.kind === kind &&
          b.run_id === plan.id &&
          b.source_id === plan.source_id &&
          (b.cursor ?? "") === cursor &&
          (!plan.target ||
            !["products", "categories", "assets", "pages"].includes(kind) ||
            b.target === plan.target),
      );
      if (
        !page ||
        page.verified !== true ||
        page.state !== "matching" ||
        page.result?.reconciled !== true ||
        page.result?.comparison?.matching !== page.digests.length ||
        page.result?.comparison?.checked !== page.digests.length
      )
        return { completed, kind, cursor, page };
      if (!page.next_cursor) break;
      cursor = page.next_cursor;
    }
    completed++;
  }
  return { completed };
}

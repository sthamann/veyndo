/** Reviewed native page submission and explicit resume share current shop/rights fences and persisted CAS intents. */
import { useRef } from "react";
import type { RequestFn } from "../../../../frontend/src/shared/api/types";
import { savePage, pageIntent, type Batch } from "./run-pages";
import type { RunPlan } from "./run-model";
import {
  isPrivate,
  importOptions,
  importRights,
  type Kind,
  type Review,
} from "./model";
type Input = {
  request: RequestFn;
  workspace: string;
  accessKey: string;
  kind: Kind;
  sourceId: string;
  mainLocale: string;
  review?: Review;
  plan?: RunPlan;
  target?: string;
  tax: string;
  sourcePriceBasis: string;
  group: string;
  cursor?: string;
  canImport: boolean;
  approved: boolean;
  destinationDigest?: string;
  name: string;
  setBusy: (busy: boolean) => void;
  setError: (message: string) => void;
  setTarget: (target: string) => void;
  setPlan: (plan: RunPlan) => void;
  setApproved: (approved: boolean) => void;
  refresh: () => void;
};
export default function useMigrationImport(p: Input) {
  const context = useRef({ request: p.request, key: "" });
  const key = [p.workspace, p.accessKey, p.plan?.id, p.kind, p.sourceId].join(
    "|",
  );
  context.current = { request: p.request, key };
  const current = () =>
    context.current.request === p.request && context.current.key === key;
  const start = async () => {
    if (
      !p.review ||
      !p.canImport ||
      !p.approved ||
      (p.review.records.length > 0 &&
        p.kind === "pages" &&
        !p.destinationDigest)
    )
      return;
    p.setBusy(true);
    p.setError("");
    try {
      const destination = isPrivate(p.kind)
        ? (p.target ??
          (await p.request("/api/environments", { name: p.name })).id)
        : p.workspace;
      if (!current()) return;
      if (isPrivate(p.kind)) p.setTarget(destination);
      if (p.plan && isPrivate(p.kind) && p.plan.target !== destination) {
        const fields = {
          title: p.plan.title,
          source_id: p.plan.source_id,
          domains: p.plan.domains,
          target: destination,
        };
        const saved = await p.request("/api/apps/migration/actions/save_run", {
          id: p.plan.id,
          revision: p.plan.revision,
          fields,
        });
        if (!current()) return;
        p.setPlan({ ...p.plan, ...fields, revision: saved.revision });
      }
      const options = !p.review.records.length
        ? {}
        : importOptions(p.kind, {
            tax: p.tax,
            sourcePriceBasis: p.sourcePriceBasis,
            group: p.group,
            mainLocale: p.mainLocale,
            destinationDigest: p.destinationDigest,
          });
      const warnings = [
        ...new Set(p.review.records.flatMap((row) => row.warnings)),
      ];
      if (warnings.length)
        Object.assign(options, { acknowledgedWarnings: warnings });
      const receipt = p.plan
        ? await savePage(
            p.request,
            p.plan,
            p.kind,
            destination,
            p.cursor,
            p.review.recordDigests,
            options,
            current,
          )
        : {};
      if (!current()) return;
      await p.request(
        "/api/apps/migration/actions/import_" + p.kind,
        {
          sourceId: p.sourceId,
          ...receipt,
          ...(p.plan ? { jobGroup: p.plan.id } : {}),
          kind: p.kind,
          target: destination,
          recordDigests: p.review.recordDigests,
          options,
          ...(p.cursor ? { cursor: p.cursor } : {}),
        },
        "POST",
        { idempotencyKey: crypto.randomUUID() },
      );
      if (current()) {
        p.setApproved(false);
        p.refresh();
      }
    } catch (e) {
      if (current()) p.setError((e as Error).message);
    } finally {
      if (current()) p.setBusy(false);
    }
  };
  const resumePage = async (page: Batch, operation: "import" | "reconcile") => {
    if (
      !importRights(page.kind).every((right) =>
        p.accessKey.split("|").includes(right),
      )
    )
      return;
    p.setBusy(true);
    p.setError("");
    try {
      await p.request(
        "/api/apps/migration/actions/import_" + page.kind,
        pageIntent(page, operation),
        "POST",
        { idempotencyKey: crypto.randomUUID() },
      );
      if (current()) p.refresh();
    } catch (e) {
      if (current()) p.setError((e as Error).message);
    } finally {
      if (current()) p.setBusy(false);
    }
  };
  return { start, resumePage };
}

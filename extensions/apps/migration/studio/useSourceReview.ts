/** Adopt only the current request's durable source evidence; changing identity or source invalidates pending presentation. */
import { useEffect, useRef, useState } from "react";
import type { RequestFn } from "../../../../frontend/src/shared/api/types";
import type { Kind, Review, Job } from "./model";
import { useInspectionText } from "./inspection-i18n";
export default function useSourceReview({
  request,
  jobs,
  kind,
  sourceId,
  onReview,
  onError,
}: {
  request: RequestFn;
  jobs: Job[];
  kind: Kind;
  sourceId: string;
  onReview: (review?: Review) => void;
  onError: (message: string) => void;
}) {
  const t = useInspectionText();
  const context = useRef({ request, kind, sourceId });
  context.current = { request, kind, sourceId };
  const sequence = useRef(0);
  const desired = useRef({ request, kind, sourceId });
  const [pending, setPending] = useState<{
    id: string;
    owner: RequestFn;
    kind: Kind;
    sourceId: string;
    sequence: number;
  }>();
  const [starting, setStarting] = useState(false);
  useEffect(() => {
    if (
      desired.current.request !== request ||
      desired.current.kind !== kind ||
      desired.current.sourceId !== sourceId
    ) {
      sequence.current++;
      desired.current = { request, kind, sourceId };
      setPending(undefined);
      setStarting(false);
    }
  }, [request, kind, sourceId]);
  useEffect(() => {
    if (
      !pending ||
      pending.owner !== request ||
      pending.kind !== kind ||
      pending.sourceId !== sourceId
    )
      return;
    const job = jobs.find((j) => j.id === pending.id);
    if (!job || ["queued", "running", "cancel_requested"].includes(job.status))
      return;
    setPending(undefined);
    if (
      job.status === "succeeded" &&
      job.result?.records &&
      job.result.kind === kind &&
      job.result.sourceId === sourceId
    )
      onReview(job.result as Review);
    else onError(t("failed"));
  }, [pending, jobs, request, kind, sourceId]);
  const inspect = async (
    cursor?: string,
    selectedKind: Kind = kind,
    profile = sourceId,
  ) => {
    const owner = request,
      serial = ++sequence.current;
    desired.current = { request: owner, kind: selectedKind, sourceId: profile };
    setStarting(true);
    setPending(undefined);
    onError("");
    onReview(undefined);
    const valid = () =>
      context.current.request === owner &&
      context.current.kind === selectedKind &&
      context.current.sourceId === profile &&
      sequence.current === serial;
    try {
      const result = await owner(
        "/api/apps/migration/actions/review_" + selectedKind,
        { sourceId: profile, ...(cursor ? { cursor } : {}) },
        "POST",
        { idempotencyKey: crypto.randomUUID() },
      );
      if (!valid()) return;
      // Older installed packages may still return a synchronous page during a rolling upgrade.
      if (Array.isArray(result.records)) onReview({ ...result, cursor });
      else if (typeof result.jobId === "string")
        setPending({
          id: result.jobId,
          owner,
          kind: selectedKind,
          sourceId: profile,
          sequence: serial,
        });
      else onError(t("failed"));
    } catch (e) {
      if (valid()) onError((e as Error).message);
    } finally {
      if (valid()) setStarting(false);
    }
  };
  return { inspect, inspecting: starting || !!pending };
}

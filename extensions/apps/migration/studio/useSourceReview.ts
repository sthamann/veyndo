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
  jobGroup,
  accessKey = "",
  onReview,
  onError,
}: {
  request: RequestFn;
  jobs: Job[];
  kind: Kind;
  sourceId: string;
  jobGroup?: string;
  accessKey?: string;
  onReview: (review?: Review) => void;
  onError: (message: string) => void;
}) {
  const t = useInspectionText();
  const context = useRef({ request, kind, sourceId, jobGroup, accessKey });
  context.current = { request, kind, sourceId, jobGroup, accessKey };
  const sequence = useRef(0);
  const desired = useRef({ request, kind, sourceId, jobGroup, accessKey });
  const [pending, setPending] = useState<{
    id: string;
    owner: RequestFn;
    kind: Kind;
    sourceId: string;
    sequence: number;
    jobGroup?: string;
    accessKey: string;
  }>();
  const [starting, setStarting] = useState(false);
  useEffect(() => {
    if (
      desired.current.request !== request ||
      desired.current.kind !== kind ||
      desired.current.sourceId !== sourceId ||
      desired.current.jobGroup !== jobGroup ||
      desired.current.accessKey !== accessKey
    ) {
      sequence.current++;
      desired.current = { request, kind, sourceId, jobGroup, accessKey };
      setPending(undefined);
      setStarting(false);
    }
  }, [request, kind, sourceId, jobGroup, accessKey]);
  useEffect(() => {
    if (
      !pending ||
      pending.owner !== request ||
      pending.kind !== kind ||
      pending.sourceId !== sourceId ||
      pending.jobGroup !== jobGroup ||
      pending.accessKey !== accessKey
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
  }, [pending, jobs, request, kind, sourceId, jobGroup, accessKey]);
  const inspect = async (
    cursor?: string,
    selectedKind: Kind = kind,
    profile = sourceId,
  ) => {
    const owner = request,
      serial = ++sequence.current;
    desired.current = {
      request: owner,
      kind: selectedKind,
      sourceId: profile,
      jobGroup,
      accessKey,
    };
    setStarting(true);
    setPending(undefined);
    onError("");
    onReview(undefined);
    const valid = () =>
      context.current.request === owner &&
      context.current.kind === selectedKind &&
      context.current.sourceId === profile &&
      context.current.jobGroup === jobGroup &&
      context.current.accessKey === accessKey &&
      sequence.current === serial;
    try {
      const result = await owner(
        "/api/apps/migration/actions/review_" + selectedKind,
        {
          sourceId: profile,
          ...(jobGroup ? { jobGroup } : {}),
          ...(cursor ? { cursor } : {}),
        },
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
          jobGroup,
          accessKey,
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

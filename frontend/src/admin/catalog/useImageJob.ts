/** Restore and reconcile native image jobs across request/locale changes; only explicit merchant actions create provider work. */
import { useEffect, useRef, useState } from "react";
import type { RequestFn } from "../shell/studio-types";
export function useImageJob(
  request: RequestFn,
  productId: string,
  failedMessage: string,
) {
  const [job, setJob] = useState<any>(),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const current = useRef({ request, productId }),
    mounted = useRef(true),
    writes = useRef(new Set<symbol>()),
    restores = useRef(new Set<symbol>());
  current.current = { request, productId };
  const reads = useRef(0),
    failedText = useRef(failedMessage);
  failedText.current = failedMessage;
  const owns = (scope: typeof current.current) =>
    mounted.current &&
    current.current.request === scope.request &&
    current.current.productId === scope.productId;
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const restore = async (scope: typeof current.current) => {
    const read = ++reads.current,
      restoreId = Symbol();
    restores.current.add(restoreId);
    if (mounted.current) setBusy(true);
    const active = () => owns(scope) && read === reads.current;
    try {
      const list = await scope.request(
        `/api/merchant/products/${scope.productId}/media/jobs`,
      );
      if (!active()) return;
      const latest = list.jobs?.[0];
      const detail = latest
        ? await scope.request(`/api/merchant/media/jobs/${latest.id}`)
        : undefined;
      if (active()) {
        setJob(detail);
        if (detail?.state === "failed") setError(failedText.current);
      }
    } catch (e) {
      if (active()) setError((e as Error).message);
    } finally {
      restores.current.delete(restoreId);
      if (mounted.current)
        setBusy(writes.current.size > 0 || restores.current.size > 0);
    }
  };
  useEffect(() => {
    setJob(undefined);
    setError("");
    setBusy(true);
    void restore({ request, productId });
  }, [request, productId]);
  useEffect(() => {
    if (!job || !["queued", "processing"].includes(job.state)) return;
    const scope = { request, productId };
    let active = true,
      polling = false;
    const timer = setInterval(async () => {
      if (polling) return;
      polling = true;
      try {
        const result = await request(`/api/merchant/media/jobs/${job.id}`);
        if (active && owns(scope)) {
          setJob(result);
          if (result.state === "failed") setError(failedText.current);
        }
      } catch (e) {
        if (active && owns(scope)) setError((e as Error).message);
      } finally {
        polling = false;
      }
    }, 2000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [request, productId, job?.id, job?.state]);
  const mutate = async (
    path: string,
    payload: unknown,
    accept: (value: any) => void,
  ) => {
    if (writes.current.size) return;
    const scope = { request, productId },
      write = Symbol();
    writes.current.add(write);
    setBusy(true);
    setError("");
    try {
      const value = await request(path, payload);
      if (owns(scope)) accept(value);
    } catch (e) {
      if (owns(scope)) setError((e as Error).message);
    } finally {
      // Keep the UI locked through reconciliation, including overlapping language refreshes.
      if (mounted.current && !owns(scope)) await restore(current.current);
      writes.current.delete(write);
      if (mounted.current)
        setBusy(writes.current.size > 0 || restores.current.size > 0);
    }
  };
  return {
    job,
    busy,
    error,
    start: (payload: unknown) =>
      mutate(`/api/merchant/products/${productId}/media/jobs`, payload, setJob),
    apply: (revision: number, onImage: (value: any) => void) =>
      job &&
      mutate(
        `/api/merchant/media/jobs/${job.id}/apply`,
        { revision },
        (value) => {
          onImage(value);
          setJob(undefined);
        },
      ),
  };
}

/** Native page evidence survives technical job archival; every load is fenced by current shop, plan and rights. */
import { useEffect, useState } from "react";
import type { RequestFn } from "../../../../frontend/src/shared/api/types";
import { readBatch, type Batch } from "./run-pages";
export default function useRunPages(
  request: RequestFn,
  run: string | undefined,
  accessKey: string,
  enabled: boolean,
  onError: (message: string) => void,
) {
  const [pages, setPages] = useState<Batch[]>([]),
    [more, setMore] = useState(false),
    [limit, setLimit] = useState(1),
    [refreshKey, setRefresh] = useState(0);
  useEffect(() => {
    setPages([]);
    setLimit(1);
    setMore(false);
  }, [request, run, accessKey]);
  useEffect(() => {
    if (!enabled || !run) {
      setPages([]);
      return;
    }
    let active = true,
      pending = false;
    const update = async () => {
      if (pending) return;
      pending = true;
      try {
        const all: Batch[] = [];
        let after: string | undefined,
          hasMore = false;
        for (let n = 0; n < limit; n++) {
          const result = await request(
            "/api/apps/migration/actions/list_batches",
            {
              limit: 100,
              filter: { run_id: run },
              ...(after ? { after } : {}),
            },
          );
          if (!active) return;
          const evidence = await request(
            "/api/apps/migration/core/job_evidence",
            {
              entity: "batches",
              ids: (result.elements ?? []).map((row: { id: string }) => row.id),
            },
          );
          if (!active) return;
          const verified = new Map(
            (evidence.verified ?? []).map(
              (row: { id: string; revision: number }) => [row.id, row.revision],
            ),
          );
          for (const value of result.elements ?? []) {
            const b = readBatch(value);
            if (b && b.run_id === run)
              all.push({ ...b, verified: verified.get(b.id) === b.revision });
          }
          hasMore = !!result.hasMore;
          after = result.nextCursor;
          if (!hasMore || !after) break;
        }
        if (active) {
          setPages(all);
          setMore(hasMore);
        }
      } catch (e) {
        if (active) onError((e as Error).message);
      } finally {
        pending = false;
      }
    };
    void update();
    const timer = setInterval(() => void update(), 4000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [request, run, accessKey, enabled, limit, refreshKey]);
  return {
    pages,
    more,
    loadMore: () => setLimit((n) => n + 1),
    refresh: () => setRefresh((n) => n + 1),
  };
}

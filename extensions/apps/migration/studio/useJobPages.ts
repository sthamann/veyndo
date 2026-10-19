/** Poll bounded native keyset pages for one selected run; never infer completion from a truncated first page. */
import { useEffect, useState } from "react";
import type { RequestFn } from "../../../../frontend/src/shared/api/types";
import type { Job } from "./model";
export default function useJobPages(
  request: RequestFn,
  enabled: boolean,
  group: string | undefined,
  onError: (message: string) => void,
  accessKey = "",
) {
  const [refreshKey, setRefreshKey] = useState(0);
  const [jobs, setJobs] = useState<Job[]>([]),
    [pages, setPages] = useState(1),
    [hasMore, setMore] = useState(false);
  useEffect(() => {
    setJobs([]);
    setPages(1);
    setMore(false);
  }, [request, group, accessKey]);
  useEffect(() => {
    if (!enabled) {
      setJobs([]);
      return;
    }
    let active = true,
      pending = false;
    const update = async () => {
      if (pending) return;
      pending = true;
      try {
        let after: string | undefined,
          result: { jobs: Job[]; hasMore?: boolean; nextCursor?: string } = {
            jobs: [],
          };
        const rows: Job[] = [];
        for (let page = 0; page < pages; page++) {
          const query = new URLSearchParams({
            limit: "100",
            ...(group ? { group } : {}),
            ...(after ? { after } : {}),
          });
          // Preserve the original URL for existing clients in ungrouped single-page mode.
          result = await request(
            "/api/apps/migration/jobs" + (group || page ? "?" + query : ""),
          );
          if (!active) return;
          rows.push(...result.jobs);
          after = result.nextCursor;
          if (!result.hasMore || !after) break;
        }
        if (active) {
          setJobs(rows);
          setMore(!!result.hasMore);
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
  }, [request, enabled, group, pages, accessKey, refreshKey]);
  return {
    jobs,
    refresh: () => setRefreshKey((value) => value + 1),
    hasMore,
    more: () => setPages((p) => Math.min(p + 1, 10)),
  };
}

/** Observe the original task worker; an accepted command is not a completed write. */
import { useEffect, useRef, useState } from "react";
import type { RequestFn } from "../shell/studio-types";
import type { SavedRun } from "../shell/useChatTurns";
type Scope = { id: string; request: RequestFn };
type Progress = {
  scope: Scope;
  busy: boolean;
  accepted: boolean;
  applied: boolean;
  run?: SavedRun;
  error: string;
  refresh: number;
};
export function useWorkspaceTaskRun(
  id: string,
  applied: boolean,
  request: RequestFn,
) {
  const scope = useRef<Scope>({ id, request });
  if (scope.current.id !== id || scope.current.request !== request)
    scope.current = { id, request };
  const owner = scope.current;
  const initial = (): Progress => ({
    scope: owner,
    busy: false,
    accepted: false,
    applied,
    error: "",
    refresh: 0,
  });
  const [saved, setSaved] = useState<Progress>(initial);
  const state = saved.scope === owner ? saved : initial();
  const update = (patch: Partial<Progress>) => {
    if (scope.current === owner)
      setSaved((old) => ({
        ...(old.scope === owner ? old : initial()),
        ...patch,
      }));
  };
  useEffect(() => {
    if (!state.accepted) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const poll = async () => {
      try {
        const run: SavedRun = await request(
          `/api/agent/runs/${encodeURIComponent(id)}`,
        );
        if (cancelled || scope.current !== owner) return;
        update({
          run,
          applied: run.state === "ready" && run.approvalRequired === false,
          error: "",
        });
        if (run.state === "queued" || run.state === "running")
          timer = setTimeout(poll, 1500);
      } catch (e) {
        if (!cancelled) update({ error: (e as Error).message });
      }
    };
    void poll();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [owner, state.accepted, state.refresh]);
  const approve = async () => {
    if (state.busy || state.accepted || state.applied) return;
    update({ busy: true, error: "" });
    try {
      const result = await request(
        `/api/agent/tasks/${encodeURIComponent(id)}/apply`,
        { approve: true },
      );
      update({
        applied: result.applied === true,
        accepted: result.queued === true,
      });
    } catch (e) {
      update({ error: (e as Error).message });
    } finally {
      update({ busy: false });
    }
  };
  const control = async (action: "resume" | "cancel") => {
    if (!state.run || state.busy) return;
    update({ busy: true, error: "" });
    try {
      const run: SavedRun = await request(
        `/api/agent/runs/${encodeURIComponent(id)}/${action}`,
        { revision: state.run.revision, approve: true },
      );
      update({ run, refresh: state.refresh + 1 });
    } catch (e) {
      update({ error: (e as Error).message });
    } finally {
      update({ busy: false });
    }
  };
  return {
    ...state,
    approve,
    control,
    reload: () => update({ refresh: state.refresh + 1 }),
  };
}

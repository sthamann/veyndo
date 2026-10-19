/** Design continues in the selected native preview and shared agent, without a second publication or inference path. */
import { useRef } from "react";
import type { RequestFn } from "../../../../frontend/src/shared/api/types";
export default function useMigrationDesign({
  request,
  target,
  onDesign,
  reference,
  setTarget,
  setBusy,
  setError,
  name,
}: {
  request: RequestFn;
  target?: string;
  reference?: string;
  name: string;
  onDesign?: (target: string, reference?: string) => void | Promise<void>;
  setTarget: (target: string) => void;
  setBusy: (busy: boolean) => void;
  setError: (error: string) => void;
}) {
  const current = useRef(request);
  current.current = request;
  return onDesign
    ? async () => {
        setBusy(true);
        setError("");
        try {
          const preview =
            target ?? (await request("/api/environments", { name })).id;
          if (current.current !== request) return;
          setTarget(preview);
          await onDesign(preview, reference);
        } catch (e) {
          if (current.current === request) setError((e as Error).message);
        } finally {
          if (current.current === request) setBusy(false);
        }
      }
    : undefined;
}

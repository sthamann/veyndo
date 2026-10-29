/** Native dirty state protects reloads and informs an optional embedded host without owning editor data. */
import { useEffect } from "react";
export function useUnsavedWorkspace(
  dirty: boolean,
  onChange?: (dirty: boolean) => void,
) {
  useEffect(() => {
    onChange?.(dirty);
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    if (dirty) window.addEventListener("beforeunload", handler);
    return () => {
      window.removeEventListener("beforeunload", handler);
      onChange?.(false);
    };
  }, [dirty, onChange]);
}

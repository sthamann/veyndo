/** Remember only the selected environment ID per live shop/tab; native requests still revalidate access. */
import { useCallback, useState, type SetStateAction } from "react";
function read(workspace: string) {
  try {
    return (
      sessionStorage.getItem(`veyndo-studio-environment:${workspace}`) ?? ""
    );
  } catch {
    return "";
  }
}
export function useStudioEnvironment(workspace: string) {
  const [selection, setSelection] = useState(() => ({
    workspace,
    environment: read(workspace),
  }));
  // Never send the previous shop's sandbox ID during the workspace transition.
  const environment =
    selection.workspace === workspace ? selection.environment : read(workspace);
  if (selection.workspace !== workspace)
    setSelection({ workspace, environment });
  const setEnvironment = useCallback(
    (value: SetStateAction<string>) => {
      setSelection((previous) => {
        const current =
          previous.workspace === workspace
            ? previous.environment
            : read(workspace);
        const next = typeof value === "function" ? value(current) : value;
        try {
          sessionStorage.setItem(
            `veyndo-studio-environment:${workspace}`,
            next,
          );
        } catch {
          /* Storage availability never changes request authority. */
        }
        return { workspace, environment: next };
      });
    },
    [workspace],
  );
  return [environment, setEnvironment] as const;
}

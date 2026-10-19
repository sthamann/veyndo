/** Current tenant package state is refetched through native consent owners, never inferred from a saved work plan. */
import { useEffect, useRef, useState } from "react";
import type { RequestFn } from "../../../../frontend/src/shared/api/types";
export default function useMigrationPackages(
  request: RequestFn,
  read: boolean,
  onError: (message: string) => void,
) {
  const current = useRef(request);
  current.current = request;
  const [app, setApp] = useState<{ active: boolean; revision: number }>(),
    [designerPackage, setDesignerPackage] = useState<{
      active: boolean;
      digest: string;
    }>();
  const load = async () => {
    const value = await request("/api/apps");
    if (current.current !== request) return;
    setApp(value.packages.find((p: { id: string }) => p.id === "migration"));
    setDesignerPackage(
      value.packages.find((p: { id: string }) => p.id === "site_builder"),
    );
  };
  useEffect(() => {
    let active = true;
    setApp(undefined);
    setDesignerPackage(undefined);
    if (read)
      void load().catch((e) => {
        if (active) onError(e.message);
      });
    return () => {
      active = false;
    };
  }, [request, read]);
  return { app, designerPackage, load };
}

/** Current Studio rights only control presentation; each native list/model operation rechecks server authority. */
import { useEffect, useState } from "react";
import type { RequestFn } from "../api/types";
export function useGridAccess(request: RequestFn) {
  const [admission, setAdmission] = useState<{
    request: RequestFn;
    rights: string[];
  }>();
  useEffect(() => {
    let current = true;
    setAdmission(undefined);
    request("/api/auth/access")
      .then((v) => {
        if (current) setAdmission({ request, rights: v.permissions ?? [] });
      })
      .catch(() => {
        if (current) setAdmission(undefined);
      });
    return () => {
      current = false;
    };
  }, [request]);
  return admission?.request === request ? admission.rights : [];
}

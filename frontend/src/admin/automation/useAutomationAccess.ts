/** Current native automation grants, cleared immediately when the workspace changes. */
import { useEffect, useState } from "react";
import type { RequestFn } from "../shell/studio-types";
export function useAutomationAccess(request: RequestFn) {
  const [access, setAccess] = useState({
    request,
    manage: false,
    canCompare: false,
  });
  useEffect(() => {
    let active = true;
    request("/api/auth/access")
      .then((v) => {
        if (active)
          setAccess({
            request,
            manage: v.permissions.includes("automation.manage"),
            canCompare: [
              "automation.read",
              "orders.read",
              "catalog.read",
              "customers.read",
              "customers.pii",
              "payments.read",
              "documents.read",
              "b2b.read",
            ].every((s) => v.permissions.includes(s)),
          });
      })
      .catch(() => {
        if (active) setAccess({ request, manage: false, canCompare: false });
      });
    return () => {
      active = false;
    };
  }, [request]);
  return access.request === request
    ? access
    : { manage: false, canCompare: false };
}

/** Current native customer group choices; no source-side group or person can create destination authority. */
import { useEffect, useState } from "react";
import type { CustomerGroup } from "../../../../frontend/src/shared/customer/customer-types";
import type { RequestFn } from "../../../../frontend/src/shared/api/types";
export default function useCustomerGroups(
  request: RequestFn,
  enabled: boolean,
  onError: (error: string) => void,
) {
  const [groups, setGroups] = useState<CustomerGroup[]>([]);
  useEffect(() => {
    let active = true;
    setGroups([]);
    if (enabled)
      void request("/api/merchant/customers/create-context")
        .then((value) => {
          if (active) setGroups(value.elements);
        })
        .catch((e) => {
          if (active) onError(e.message);
        });
    return () => {
      active = false;
    };
  }, [request, enabled]);
  return groups;
}

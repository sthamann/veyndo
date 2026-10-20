/** Preserve the originating editor selection as a bounded hint, fenced to the current account/shop/stage. */
import { useRef } from "react";
import type { EntityTarget } from "./useEntityNavigation";
import type { Tab } from "./navigation";
export function useAgentWorkspaceContext(
  scope: string,
  tab: Tab,
  target?: EntityTarget,
) {
  const origin = useRef<
    | {
        scope: string;
        value: { view: string; selected?: { kind: string; id: string } };
      }
    | undefined
  >(undefined);
  const current = {
    view: tab,
    selected: target
      ? {
          kind:
            target.tab === "productData"
              ? "product"
              : target.tab === "orders"
                ? "order"
                : "customer",
          id: target.id,
        }
      : undefined,
  };
  return {
    workspaceContext:
      tab === "assistant" && origin.current?.scope === scope
        ? origin.current.value
        : current,
    remember: () => {
      if (tab !== "assistant") origin.current = { scope, value: current };
    },
  };
}

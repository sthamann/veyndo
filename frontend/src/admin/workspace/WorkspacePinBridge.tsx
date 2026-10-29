/** The shared grid pins criteria in the existing actor-private workspace; rows and credentials are never copied. */
import { clearPinnedView } from "../../shared/grid/pinned-view";
import { clearGoalFlow } from "../automation/goal-template";
import { useEffect } from "react";
import { useStudio } from "../shell/StudioContext";
import { canOpenStudio } from "../shell/permissions";
import { pinWorkspaceView } from "./pin-workspace-view";
import {
  admitWorkspaceView,
  type WorkspaceComponent,
} from "../../shared/grid/workspace-view";
export default function WorkspacePinBridge() {
  const { liveRequest, workspace, tab, access, setNotice, setError } =
    useStudio();
  useEffect(
    () => () => {
      clearPinnedView();
      clearGoalFlow();
    },
    [workspace, liveRequest],
  );
  useEffect(() => {
    let current = true,
      busy = false;
    const pin = async (event: Event) => {
      if (busy) return;
      const detail = (
        event as CustomEvent<{
          criteria: Record<string, string | boolean>;
          title: string;
          entity?: string;
          components?: WorkspaceComponent[];
        }>
      ).detail;
      if (!detail?.criteria) return;
      const view = detail.entity
        ? admitWorkspaceView(
            {
              entity: detail.entity,
              criteria: detail.criteria,
              components: detail.components,
            },
            access,
          )
        : null;
      if (detail.entity && !view) return;
      const target = view
        ? view.entity === "products"
          ? "productData"
          : view.entity
        : tab;
      if (!canOpenStudio(target, access)) return;
      busy = true;
      try {
        const entity = target === "productData" ? "products" : target;
        if (
          entity !== "orders" &&
          entity !== "customers" &&
          entity !== "products"
        )
          return;
        await pinWorkspaceView(
          liveRequest,
          access,
          detail.title,
          {
            entity,
            criteria: detail.criteria,
            components: detail.components,
          },
          () => current,
        );
        if (current) setNotice({ key: "workspacePinned" });
      } catch (e) {
        if (current) setError((e as Error).message);
      } finally {
        busy = false;
      }
    };
    window.addEventListener("veyndo.workspace.pin", pin);
    return () => {
      current = false;
      window.removeEventListener("veyndo.workspace.pin", pin);
    };
  }, [liveRequest, workspace, tab, access]);
  return null;
}

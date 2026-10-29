/** Native grids and composed views share actor-private layout CAS; records and personal criteria never persist. */
import type { RequestFn } from "../shell/studio-types";
import {
  admitWorkspaceView,
  type WorkspaceView,
} from "../../shared/grid/workspace-view";
import { safePinnedCriteria } from "../../shared/grid/pinned-view";
import { newArea, type WorkspaceRecord } from "./workspace-model";

export async function pinWorkspaceView(
  request: RequestFn,
  rights: string[],
  title: string,
  candidate: WorkspaceView,
  current: () => boolean = () => true,
) {
  const view = admitWorkspaceView(candidate, rights);
  if (!view || !title.trim()) throw new Error("Invalid workspace view");
  const record = (await request("/api/studio/workspace")) as WorkspaceRecord;
  if (!current()) return;
  const area =
    record.data.areas.find((a) => a.id === record.data.active) ??
    record.data.areas[0] ??
    newArea(title.slice(0, 100), "owner", rights);
  if (area.pins.length >= 20) throw new Error("Workspace pin limit reached");
  const next = {
    ...area,
    pins: [
      ...area.pins,
      {
        title: title.slice(0, 100),
        tab:
          view.entity === "products" ? ("productData" as const) : view.entity,
        query: JSON.stringify(safePinnedCriteria(view.criteria)),
        ...(candidate.components ? { components: view.components } : {}),
      },
    ],
  };
  return request(
    "/api/studio/workspace",
    {
      revision: record.revision,
      data: {
        ...record.data,
        active: area.id,
        areas: [...record.data.areas.filter((a) => a.id !== area.id), next],
      },
    },
    "PUT",
  );
}

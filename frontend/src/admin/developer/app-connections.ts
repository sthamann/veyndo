/** Draft-only connection hints reference the canonical Manifest; Rust still validates and authorizes save/install/runtime. */
import type { Manifest } from "../../shared/apps/native/types";
import type { AppStudioKey } from "../../shared/i18n/app-studio-i18n";
import { calls } from "./control-model";
export type ConnectionIssue = {
  kind:
    | "viewMissing"
    | "modelMissing"
    | "actionMissing"
    | "relationMissing"
    | "agentUnavailable"
    | "examplesMissing";
  reference: string;
  tab: AppStudioKey;
};
export function diagnoseConnections(m: Manifest): ConnectionIssue[] {
  const issues: ConnectionIssue[] = [],
    actions = new Map((m.actions ?? []).map((a) => [a.name, a]));
  const add = (
    kind: ConnectionIssue["kind"],
    reference: string,
    tab: AppStudioKey,
  ) => {
    if (!issues.some((i) => i.kind === kind && i.reference === reference))
      issues.push({ kind, reference, tab });
  };
  for (const surface of m.surfaces ?? []) {
    if (
      surface.uiPath.startsWith("native/") &&
      !m.views?.some((v) => surface.uiPath === `native/${v.id}`)
    )
      add("viewMissing", surface.id, "design");
    for (const action of surface.actions)
      if (!actions.has(action))
        add("actionMissing", `${surface.id} → ${action}`, "connect");
  }
  for (const view of m.views ?? [])
    for (const block of view.blocks) {
      if (block.entity && !m.entities.some((e) => e.name === block.entity))
        add("modelMissing", `${view.id}/${block.id} → ${block.entity}`, "data");
      for (const action of [
        block.readAction,
        block.writeAction,
        ...calls(block.handlers?.click ?? []),
        ...calls(block.handlers?.change ?? []),
      ]) {
        if (action && !actions.has(action))
          add("actionMissing", `${view.id}/${block.id} → ${action}`, "connect");
      }
    }
  for (const entity of m.entities)
    for (const field of entity.fields) {
      if (
        field.references &&
        !m.entities.some((e) => e.name === field.references)
      )
        add(
          "relationMissing",
          `${entity.name}.${field.name} → ${field.references}`,
          "data",
        );
    }
  for (const route of m.apiRoutes ?? [])
    if (!actions.has(route.action))
      add(
        "actionMissing",
        `${route.method} ${route.path} → ${route.action}`,
        "connect",
      );
  for (const entity of m.intelligence?.entities ?? [])
    if (!m.entities.some((e) => e.name === entity))
      add("modelMissing", entity, "data");
  for (const action of m.actions ?? [])
    if (action.entity && !m.entities.some((e) => e.name === action.entity))
      add("modelMissing", `${action.name} → ${action.entity}`, "data");
  for (const tool of m.intelligence?.tools ?? [])
    if (actions.get(tool)?.mcp !== true)
      add("agentUnavailable", tool, "connect");
  for (const item of [...(m.schedules ?? []), ...(m.webhooks ?? [])])
    if (!actions.has(item.action))
      add("actionMissing", `${item.id} → ${item.action}`, "connect");
  if (m.commerceHooks?.hooks.length && !m.capability?.examples.length)
    add("examplesMissing", m.commerceHooks.hooks.join(", "), "capability");
  return issues;
}

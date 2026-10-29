/** Validated presentation bindings reuse native directories; model output never contains data or authority. */
import type { GridCriteria, GridEntity } from "./types";
export type WorkspaceComponent = "records" | "details" | "intake";
export type WorkspaceView = {
  entity: GridEntity;
  criteria: GridCriteria;
  components?: WorkspaceComponent[];
};
const criteriaKeys = new Set([
  "sort",
  "direction",
  "state",
  "paymentState",
  "deliveryState",
  "channelId",
  "from",
  "to",
  "group",
  "categoryId",
  "active",
  "guest",
  "lowStock",
  "query",
  "customer",
  "search",
  "parentId",
  "appFilter",
]);
export function admitWorkspaceView(
  value: unknown,
  rights: string[],
): WorkspaceView | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const v = value as Record<string, unknown>;
  if (
    Object.keys(v).some(
      (key) => !["entity", "criteria", "components"].includes(key),
    )
  )
    return null;
  const entity = v.entity;
  if (entity !== "products" && entity !== "orders" && entity !== "customers")
    return null;
  if (
    !rights.includes(
      entity === "products" ? "catalog.read" : `${entity}.read`,
    ) ||
    (entity !== "products" && !rights.includes("customers.pii"))
  )
    return null;
  if (
    !v.criteria ||
    typeof v.criteria !== "object" ||
    Array.isArray(v.criteria) ||
    Object.entries(v.criteria).some(
      ([key, item]) =>
        !criteriaKeys.has(key) ||
        (typeof item !== "boolean" &&
          (typeof item !== "string" ||
            item.length > (key === "appFilter" ? 4096 : 200))),
    )
  )
    return null;
  const components = v.components ?? ["records"];
  if (
    !Array.isArray(components) ||
    components.length < 1 ||
    components.length > 3 ||
    !components.includes("records") ||
    new Set(components).size !== components.length ||
    components.some(
      (c) =>
        !["records", "details", "intake"].includes(c) ||
        (c === "intake" && entity !== "products"),
    )
  )
    return null;
  return {
    entity,
    criteria: { ...v.criteria } as GridCriteria,
    components: [...components],
  };
}

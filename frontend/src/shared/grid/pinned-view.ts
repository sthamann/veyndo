/** Ephemeral presentation handoff; persisted views exclude free search/person criteria and never copy rows. */
import type { GridCriteria } from "./types";
const keys = new Set([
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
]);
export function safePinnedCriteria(criteria: GridCriteria): GridCriteria {
  return Object.fromEntries(
    Object.entries(criteria).filter(
      ([key, value]) =>
        keys.has(key) &&
        (typeof value === "boolean" ||
          (typeof value === "string" &&
            /^[a-zA-Z0-9_.:-]{1,100}$/.test(value))),
    ),
  );
}
let pending:
  { tab: string; criteria: GridCriteria; expires: number } | undefined;
export function openPinnedView(tab: string, query: string) {
  const criteria = safePinnedCriteria(JSON.parse(query || "{}"));
  pending = { tab, criteria, expires: Date.now() + 30000 };
}
export function consumePinnedView(tab: string): GridCriteria | undefined {
  if (!pending || pending.expires < Date.now() || pending.tab !== tab) return;
  const criteria = pending.criteria;
  pending = undefined;
  return criteria;
}
export function clearPinnedView() {
  pending = undefined;
}

/** Already reviewed agent filters remain ephemeral, including personal search terms; never used for persisted pins. */
export function openReviewedView(tab: string, criteria: GridCriteria) {
  if (!["orders", "customers", "productData"].includes(tab)) return;
  const allowed = new Set([
    ...keys,
    "query",
    "customer",
    "search",
    "parentId",
    "appFilter",
  ]);
  if (
    Object.entries(criteria).some(
      ([key, value]) =>
        !allowed.has(key) ||
        (typeof value !== "boolean" &&
          (typeof value !== "string" ||
            value.length > (key === "appFilter" ? 4096 : 200))),
    )
  )
    return;
  pending = { tab, criteria: { ...criteria }, expires: Date.now() + 30000 };
}

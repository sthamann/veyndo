/** Defensive work-plan projection; metadata cannot select unknown domains or become an import receipt. */
import type { Kind } from "./model";
export type RunPlan = {
  id: string;
  revision: number;
  title: Record<string, string>;
  source_id: string;
  target?: string;
  domains: Kind[];
};
export const domains: Kind[] = [
  "categories",
  "products",
  "assets",
  "pages",
  "customers",
  "orders",
  "reviews",
  "coupons",
];
export function readRunPlan(value: unknown): RunPlan | undefined {
  if (!value || typeof value !== "object") return;
  const p = value as Record<string, unknown>,
    text = (v: unknown): v is string =>
      typeof v === "string" && !!v.trim() && v.length <= 100;
  if (
    !text(p.id) ||
    !Number.isSafeInteger(p.revision) ||
    (p.revision as number) < 1 ||
    !text(p.source_id) ||
    (p.target !== undefined && !text(p.target)) ||
    !Array.isArray(p.domains) ||
    !p.domains.length ||
    p.domains.length > domains.length ||
    new Set(p.domains).size !== p.domains.length ||
    !p.domains.every((k) => domains.includes(k)) ||
    !p.title ||
    typeof p.title !== "object" ||
    Array.isArray(p.title) ||
    !Object.values(p.title).length ||
    !Object.values(p.title).every(text)
  )
    return;
  return p as RunPlan;
}

/** Keep only a protected task reference in Flow configuration; operation inputs stay in actor-private evidence. */
import type { Preview } from "../shell/studio-types";
export type WorkStep = { name: string; label: string; arguments_json: string };
export type WorkBinding = { step: number; pointer: string; source: string };
export type WorkTemplate = {
  taskId: string;
  bindings: WorkBinding[];
  dailyLimit: number;
};
export function scalarFields(
  value: unknown,
  path = "",
): { pointer: string; value: string | number }[] {
  if (typeof value === "string" || typeof value === "number")
    return [{ pointer: path, value }];
  if (!value || typeof value !== "object") return [];
  return Object.entries(value).flatMap(([key, child]) =>
    scalarFields(
      child,
      `${path}/${key.replaceAll("~", "~0").replaceAll("/", "~1")}`,
    ),
  );
}
export function copyWorkTemplate(
  taskId: string,
  preview: Preview,
): WorkTemplate | null {
  const operations = preview.proposal.operations;
  if (!operations?.length || operations.length > 12) return null;
  try {
    const steps = operations.map(({ name, label, arguments_json }) => ({
      name,
      label,
      arguments_json,
    }));
    const args = steps.map((s) => JSON.parse(s.arguments_json));
    const created = new Map<string, string>();
    steps.forEach((s, i) => {
      const key =
        s.name === "merchant.product.create"
          ? "product"
          : s.name === "merchant.category.create"
            ? "category"
            : null;
      if (key && typeof args[i][key]?.id === "string")
        created.set(args[i][key].id, `run.key:step_${i}`);
    });
    const bindings = args.flatMap((a, step) =>
      scalarFields(a).flatMap(({ pointer, value }) =>
        typeof value === "string" && created.has(value)
          ? [{ step, pointer, source: created.get(value)! }]
          : [],
      ),
    );
    const result = { taskId, bindings, dailyLimit: 10 };
    return new TextEncoder().encode(JSON.stringify(result)).length <= 16384
      ? result
      : null;
  } catch {
    return null;
  }
}

/** Review real proposed page changes and viewport entry points; never infer visual correctness or app execution from a model summary. */
import type { Page, PageFields } from "../model";
import { useReviewText } from "./review-i18n";
export default function DesignReview({
  before,
  after,
  onPreview,
}: {
  before: Page;
  after: PageFields;
  onPreview: (device: "desktop" | "mobile") => void;
}) {
  const t = useReviewText();
  const old = before.content.blocks,
    next = after.content.blocks;
  const inserted = next.filter((b) => !old.some((o) => o.id === b.id)).length;
  const removed = old.filter((b) => !next.some((n) => n.id === b.id)).length;
  const moved = next.filter(
    (b, i) =>
      old.some((o) => o.id === b.id) &&
      old.findIndex((o) => o.id === b.id) !== i,
  ).length;
  const theme = new Set([
    ...Object.keys(before.theme),
    ...Object.keys(after.theme),
  ]);
  const changed = [...theme].filter(
    (k) =>
      before.theme[k as keyof typeof before.theme] !==
      after.theme[k as keyof typeof after.theme],
  ).length;
  return (
    <section className="designer-review" aria-label={t("title")}>
      <strong>{t("title")}</strong>
      <dl>
        {(
          [
            ["inserted", inserted],
            ["removed", removed],
            ["moved", moved],
            ["theme", changed],
            ["forms", next.filter((b) => b.kind === "form").length],
            ["apps", next.filter((b) => b.kind === "app").length],
          ] as const
        ).map(([key, count]) => (
          <div key={key}>
            <dt>{t(key)}</dt>
            <dd>{count}</dd>
          </div>
        ))}
      </dl>
      <p>{t("hint")}</p>
      <div className="designer-variant-actions">
        {(["desktop", "mobile"] as const).map((device) => (
          <button type="button" key={device} onClick={() => onPreview(device)}>
            {t(device)}
          </button>
        ))}
      </div>
    </section>
  );
}

/** A saved plan walks reviewed pages in dependency order; truncated history never proves completion. */
import type { RunPlan } from "./run-model";
import { nextPage, type Batch } from "./run-pages";
import { useMigrationText } from "./i18n";
import { useProgressText } from "./run-progress-i18n";
import type { Kind } from "./model";
export default function RunProgress({
  plan,
  pages,
  hasMore,
  loadMore,
  busy,
  active,
  onNext,
  onRun,
}: {
  plan: RunPlan;
  pages: Batch[];
  hasMore: boolean;
  loadMore: () => void;
  busy: boolean;
  active: boolean;
  onNext: (kind: Kind, cursor?: string) => void;
  onRun: (page: Batch, operation: "import" | "reconcile") => void;
}) {
  const t = useProgressText(),
    label = useMigrationText(),
    next = nextPage(plan, pages);
  return (
    <section className="studio-card migration-run-progress">
      <h2>{t("title")}</h2>
      <p>{t("notice")}</p>
      <progress value={next.completed} max={plan.domains.length} />
      <p>
        {next.completed} / {plan.domains.length}
      </p>
      {active ? (
        <p role="status">{t("active")}</p>
      ) : hasMore ? (
        <button onClick={loadMore}>{t("more")}</button>
      ) : next.blocked ? (
        <p role="alert">{t("cycle")}</p>
      ) : next.kind ? (
        <div className="migration-run-next">
          <strong>{label(next.kind)}</strong>
          <button
            className="studio-primary"
            disabled={busy}
            onClick={() =>
              next.page &&
              (next.page.verified || next.page.state === "reviewed")
                ? onRun(
                    next.page,
                    next.page.state === "reviewed" ? "import" : "reconcile",
                  )
                : onNext(next.kind!, next.cursor || undefined)
            }
          >
            {t(
              next.page &&
                (next.page.verified || next.page.state === "reviewed")
                ? next.page.state === "reviewed"
                  ? "resume"
                  : "compare"
                : "next",
            )}
          </button>
          {next.page && (
            <button
              disabled={busy}
              onClick={() => onNext(next.kind!, next.cursor || undefined)}
            >
              {t("reviewAgain")}
            </button>
          )}
        </div>
      ) : (
        <strong>{t("done")}</strong>
      )}
      {!!pages.length && (
        <details>
          <summary>
            {t("saved")} · {pages.length}
          </summary>
          {pages.map((page) => (
            <article key={page.id} className="migration-job">
              <strong>{label(page.kind)}</strong>
              {page.verified && page.result?.comparison && (
                <>
                  <p>
                    {t("matching")}: {page.result.comparison.matching} ·{" "}
                    {t("changed")}: {page.result.comparison.changed} ·{" "}
                    {t("missing")}: {page.result.comparison.missing}
                  </p>
                  <p>
                    {t("checked")}:{" "}
                    <time>{page.result.comparison.checkedAt}</time>
                  </p>
                  {page.result.comparison.examples?.map((example) => (
                    <ul key={example.id}>
                      {example.differences.map((path) => (
                        <li key={path}>
                          <code>{path}</code>
                        </li>
                      ))}
                    </ul>
                  ))}
                </>
              )}
              <button
                disabled={busy || active}
                onClick={() => onRun(page, "reconcile")}
              >
                {t("compare")}
              </button>
            </article>
          ))}
        </details>
      )}
    </section>
  );
}

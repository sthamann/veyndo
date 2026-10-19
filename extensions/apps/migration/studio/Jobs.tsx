/** Saved job controls use native CAS, explicit uncertain-outcome acknowledgement and current action permissions. */
import type { RequestFn } from "../../../../frontend/src/shared/api/types";
import { useLocale } from "../../../../frontend/src/shared/i18n/i18n";
import { contentText } from "../../../../frontend/src/shared/i18n/content-language";
import { useMigrationText } from "./i18n";
import { useInspectionText } from "./inspection-i18n";
import { jobKind, type Job, type Review } from "./model";
export default function Jobs({
  request,
  jobs,
  manage,
  busy,
  onBusy,
  onError,
  onRefresh,
  onNext,
  onReview,
}: {
  request: RequestFn;
  jobs: Job[];
  manage: boolean;
  busy: boolean;
  onBusy: (value: boolean) => void;
  onError: (value: string) => void;
  onRefresh: () => void;
  onReview: (review: Review) => void;
  onNext: (result: NonNullable<Job["result"]>) => Promise<void>;
}) {
  const inspectionText = useInspectionText();
  const t = useMigrationText(),
    { locale } = useLocale();
  return (
    <>
      {jobs.map((job) => (
        <article className="migration-job" key={job.id}>
          <strong>
            {jobKind(job) && <>{t(jobKind(job)!)} · </>}
            {job.action?.startsWith("review_") && job.status === "succeeded"
              ? inspectionText("ready")
              : t(("status_" + job.status) as Parameters<typeof t>[0])}
          </strong>
          <progress value={job.progress} max={100} />
          <p>{contentText(job.message, locale, locale)}</p>
          {typeof job.result?.imported === "number" && (
            <p>
              {job.result.imported} / {job.result.reviewed}
            </p>
          )}
          {job.status === "succeeded" &&
            job.action?.startsWith("review_") &&
            job.result?.records && (
              <button
                disabled={busy}
                onClick={() => onReview(job.result as Review)}
              >
                {inspectionText("open")}
              </button>
            )}
          {["running", "queued", "failed", "uncertain"].includes(
            job.status,
          ) && (
            <button
              disabled={busy || !manage}
              className="studio-secondary"
              onClick={async () => {
                onBusy(true);
                onError("");
                try {
                  await request("/api/apps/migration/jobs/" + job.id, {
                    operation: ["failed", "uncertain"].includes(job.status)
                      ? "retry"
                      : "cancel",
                    revision: job.revision,
                    approveUnknownOutcome: true,
                  });
                  onRefresh();
                } catch (e) {
                  onError((e as Error).message);
                } finally {
                  onBusy(false);
                }
              }}
            >
              {t(
                ["failed", "uncertain"].includes(job.status)
                  ? "retry"
                  : "cancel",
              )}
            </button>
          )}
          {job.status === "succeeded" && job.result?.nextCursor && (
            <button disabled={busy} onClick={() => void onNext(job.result!)}>
              {t("next")}
            </button>
          )}
        </article>
      ))}
    </>
  );
}

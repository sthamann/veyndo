/** Native job history remains paged and visibly distinct from a whole-shop completion report. */
import type { ComponentProps } from "react";
import Jobs from "./Jobs";
import { useRunText } from "./run-i18n";
import { useMigrationText } from "./i18n";
export default function JobHistory({
  grouped,
  more,
  hasMore,
  ...props
}: ComponentProps<typeof Jobs> & {
  grouped: boolean;
  more: () => void;
  hasMore: boolean;
}) {
  const rt = useRunText(),
    t = useMigrationText();
  return (
    <section className="studio-card">
      <h2>{t("jobs")}</h2>
      {grouped && (
        <p>
          {rt("linked")}: {props.jobs.length}. {rt("notice")}
        </p>
      )}
      <Jobs {...props} />
      {hasMore && (
        <button disabled={props.busy} onClick={more}>
          {rt("more")}
        </button>
      )}
    </section>
  );
}

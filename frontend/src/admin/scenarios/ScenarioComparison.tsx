/** Matching test inputs and changed observed snapshots are separate evidence. */
import type { Report } from "./scenario-types";
import { useScenarioText } from "./scenario-i18n";
export default function ScenarioComparison({
  before,
  after,
}: {
  before: Report;
  after: Report;
}) {
  const t = useScenarioText();
  const digest = (r: Report) =>
    r.runs[0]?.scenario?.comparisonDigest ??
    r.runs[0]?.preview?.scenario?.comparisonDigest;
  const matched = !!digest(before) && digest(before) === digest(after);
  const snapshots = (r: Report) => {
    if (
      !r.runs.length ||
      r.runs.some((run) => !run.preview?.scenario?.snapshotDigest)
    )
      return undefined;
    return r.runs
      .map(
        (run) =>
          `${run.scenario?.profile.id ?? run.preview?.scenario?.profile.id}:${run.preview?.scenario?.snapshotDigest}`,
      )
      .sort()
      .join("|");
  };
  const oldSnapshot = snapshots(before),
    newSnapshot = snapshots(after);
  return (
    <aside className="scenario-comparison-note" role="status">
      <strong>{t(matched ? "matching" : "mismatch")}</strong>
      {matched && (!oldSnapshot || !newSnapshot) && (
        <p>{t("pendingComparison")}</p>
      )}
      {matched && oldSnapshot && newSnapshot && oldSnapshot !== newSnapshot && (
        <p>{t("changedSnapshot")}</p>
      )}
      <p>{t("comparisonHint")}</p>
    </aside>
  );
}

/** Bounded native comparison summaries expose counts, never private source values. */
import type { Job } from "./model";
import { useProgressText } from "./run-progress-i18n";
export default function Comparison({ result }: { result?: Job["result"] }) {
  const t = useProgressText(),
    c = result?.comparison;
  if (!c) return null;
  return (
    <p>
      {t("matching")}: {c.matching} · {t("changed")}: {c.changed} ·{" "}
      {t("missing")}: {c.missing}
    </p>
  );
}

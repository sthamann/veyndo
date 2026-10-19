/** Exact pinned export scope is visible before any page approval; aggregate counts are not native parity claims. */
import type { Review } from "./model";
import { useExportText } from "./export-i18n";
export default function ExportEvidence({
  source,
}: {
  source: NonNullable<Review["sourceExport"]>;
}) {
  const t = useExportText();
  return (
    <aside className="migration-source-export">
      <strong>{t("title")}</strong>
      <p>
        {t("counts")
          .replace("{source}", String(source.sourceRecords))
          .replace("{normalized}", String(source.normalizedRecords))
          .replace("{pages}", String(source.pages))}
      </p>
      <code>{source.digest}</code>
      <p>{t("notice")}</p>
    </aside>
  );
}

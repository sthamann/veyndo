/** Source business evidence stays visible before approval; imported claims never become native purchase or activation authority. */
import { useLocale } from "../../../../frontend/src/shared/i18n/i18n";
import { useFeedbackText } from "./feedback-i18n";
import type { SourceRecord } from "./model";
export default function SourceDetails({ row }: { row: SourceRecord }) {
  const t = useFeedbackText();
  const { locale } = useLocale();
  const d = row.data;
  if (row.kind === "reviews") {
    const date = d.createdAt ? new Date(d.createdAt) : null;
    return (
      <div className="migration-source-detail">
        <dl>
          <dt>{t("author")}</dt>
          <dd>{d.sourceAuthor}</dd>
          <dt>{t("rating")}</dt>
          <dd>{d.rating} / 5</dd>
          <dt>{t("created")}</dt>
          <dd>
            <time dateTime={d.createdAt}>
              {date && Number.isFinite(date.getTime())
                ? new Intl.DateTimeFormat(locale, {
                    dateStyle: "medium",
                    timeStyle: "short",
                    timeZone: "UTC",
                  }).format(date) + " UTC"
                : d.createdAt}
            </time>
          </dd>
          <dt>{t("sourceClaim")}</dt>
          <dd>
            {d.sourceVerified === true
              ? t("yes")
              : d.sourceVerified === false
                ? t("no")
                : "—"}
          </dd>
        </dl>
        <blockquote>{d.text}</blockquote>
        <p className="migration-intake-notice">{t("moderation")}</p>
      </div>
    );
  }
  if (row.kind !== "coupons") return null;
  const rules = d.sourceRules ?? {};
  return (
    <div className="migration-source-detail">
      <dl>
        <dt>{t("currency")}</dt>
        <dd>{d.currency}</dd>
        <dt>{t("remaining")}</dt>
        <dd>
          {d.destination?.maxUses === null
            ? t("unlimited")
            : (d.destination?.maxUses ?? "—")}
        </dd>
        <dt>{t("used")}</dt>
        <dd>{rules.usage_count ?? "—"}</dd>
        <dt>{t("minimum")}</dt>
        <dd>
          {rules.minimum_amount ?? "—"} {d.currency}
        </dd>
        <dt>{t("maximum")}</dt>
        <dd>
          {rules.maximum_amount ?? "—"} {d.currency}
        </dd>
        <dt>{t("expires")}</dt>
        <dd>{d.destination?.end ?? "—"}</dd>
        <dt>{t("exclusive")}</dt>
        <dd>{rules.individual_use === true ? t("yes") : t("no")}</dd>
      </dl>
      <p className="migration-intake-notice">{t("inactive")}</p>
    </div>
  );
}

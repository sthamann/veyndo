/** ProposalCard keeps merchant interaction separate from workspace orchestration. */
import { useAgentWorkspaceText } from "../../shared/i18n/agent-workspace-i18n";
import { useAppText } from "../../shared/i18n/app-i18n";
import { useLocale } from "../../shared/i18n/i18n";
import { useBuildingText } from "../../shared/i18n/app-building-i18n";
import Icon from "../../shared/ui/Icon";
import type { Message } from "../shell/studio-types";
import { useCompositionText } from "../workspace/composition-i18n";
import type { WorkspaceView } from "../../shared/grid/workspace-view";
export default function ProposalCard({
  message,
  onApply,
  busy,
  canApply,
  approvalStarted = false,
  onOpenView,
  onOpenWorkspace,
}: {
  message: Message;
  onApply: () => void;
  busy: boolean;
  canApply: boolean;
  approvalStarted?: boolean;
  onOpenWorkspace?: (view: WorkspaceView) => void;
  onOpenView?: (
    view: NonNullable<
      NonNullable<Message["data"]["preview"]>["proposal"]["view"]
    >,
  ) => void;
}) {
  const { t, money } = useLocale();
  const { a } = useAppText();
  const composed = useCompositionText();
  const b = useBuildingText(),
    aw = useAgentWorkspaceText();
  const preview = message.data.preview;
  if (!preview) return null;
  const changes = preview.proposal.changes;
  const translations = new URL(location.href);
  translations.searchParams.set("studio", "commerce");
  translations.searchParams.set("settings", "languages");
  translations.searchParams.set("translationJob", message.data.taskId ?? "");
  translations.hash = "merchant";
  if (
    !changes.length &&
    !preview.proposal.experience &&
    !preview.proposal.app_action &&
    !preview.proposal.translation &&
    !preview.proposal.operations?.length &&
    !preview.proposal.view
  )
    return null;
  return (
    <section
      className={`proposal-review ${message.applied ? "is-applied" : ""}`}
    >
      {!canApply && !busy && !message.applied && !approvalStarted && (
        <p>{t("readOnly")}</p>
      )}
      <header>
        <div className="review-status">
          <Icon name={message.applied ? "check" : "pulse"} size={18} />
          <span>{message.applied ? t("applied") : t("pending")}</span>
        </div>
        <span>
          {preview.proposal.operations?.length || changes.length || 1}
        </span>
      </header>
      {preview.proposal.operations?.map((step, index) => (
        <div className="review-product" key={index}>
          <b>
            {index + 1}. {step.label}
          </b>
          <details>
            <summary>{step.name}</summary>
            <pre>{step.arguments_json}</pre>
          </details>
        </div>
      ))}
      {preview.proposal.view && (
        <div className="review-product">
          {onOpenWorkspace && (
            <button
              type="button"
              className="studio-primary"
              disabled={busy}
              onClick={() => onOpenWorkspace(preview.proposal.view!)}
            >
              <Icon name="box" />
              {composed("open")}
            </button>
          )}
          <details>
            <summary>{t("details")}</summary>
            <pre>{JSON.stringify(preview.proposal.view.criteria, null, 2)}</pre>
          </details>
          {onOpenView && (
            <button
              type="button"
              className="studio-primary"
              disabled={busy}
              onClick={() => onOpenView(preview.proposal.view!)}
            >
              {aw("openView")}
            </button>
          )}
        </div>
      )}
      {changes.map((c) => {
        const before = preview.catalogBefore.find((p) => p.id === c.product_id);
        return (
          <div className="review-product" key={c.product_id}>
            <b>{before?.name || c.product_id}</b>
            {c.price != null && (
              <div>
                <span>{t("grossPrice")}</span>
                <div className="before-after">
                  <span>
                    <small>{t("before")}</small>
                    {money(before?.price || 0)}
                  </span>
                  <Icon name="arrow" size={16} />
                  <strong>
                    <small>{t("after")}</small>
                    {money(c.price)}
                  </strong>
                </div>
              </div>
            )}
            {c.stock != null && (
              <div>
                <span>{t("stock")}</span>
                <div className="before-after">
                  <span>{before?.stock}</span>
                  <Icon name="arrow" size={16} />
                  <strong>{c.stock}</strong>
                </div>
              </div>
            )}
          </div>
        );
      })}
      {preview.proposal.translation && (
        <div className="review-product">
          <b>
            {b("translationDrafts")} · {preview.proposal.translation}
          </b>
          <p>
            {preview.proposal.translation_products
              ? b("selectedTranslationBoundary").replace(
                  "{count}",
                  String(preview.proposal.translation_products.length),
                )
              : b("translationBoundary")}
          </p>
          {preview.proposal.translation_products && (
            <ul>
              {preview.proposal.translation_products.map((id) => (
                <li key={id}>
                  {preview.catalogBefore.find((p) => p.id === id)?.name ?? id}
                </li>
              ))}
            </ul>
          )}
          {message.applied && (
            <a className="studio-secondary" href={translations.href}>
              {b("reviewTranslations")}
            </a>
          )}
        </div>
      )}
      {preview.proposal.app_action && (
        <div className="review-product">
          <b>{preview.proposal.app_action.app}</b>
          <p>{preview.proposal.app_action.action}</p>
          {Object.entries(
            JSON.parse(preview.proposal.app_action.arguments_json).fields ?? {},
          ).map(([field, value]) => (
            <p key={field}>
              <span>{a(field)}</span> ·{" "}
              <strong>
                {field === "fee_minor" && typeof value === "number"
                  ? money(value / 100)
                  : String(value)}
              </strong>
            </p>
          ))}
        </div>
      )}
      {preview.proposal.experience && (
        <div className="review-product">
          <b>{t("storefront")}</b>
          <p>
            {preview.proposal.experience.mode === "comparison"
              ? t("comparison")
              : preview.proposal.experience.mode === "discovery"
                ? t("discovery")
                : t("summary")}
          </p>
          <blockquote>{preview.proposal.experience.headline}</blockquote>
        </div>
      )}
      {!message.applied && !approvalStarted && !preview.proposal.view && (
        <footer>
          <span>
            <Icon name="lock" size={14} />
            {t("trust")}
          </span>
          <button
            className="studio-primary"
            disabled={busy || !canApply}
            onClick={onApply}
          >
            {t("approve")}
            <Icon name="check" size={18} />
          </button>
        </footer>
      )}
    </section>
  );
}

/** Declared package diagnostics link to their real editors; counts never claim a successful runtime test or installed secret. */
import type { Manifest } from "../../shared/apps/native/types";
import type { AppStudioKey } from "../../shared/i18n/app-studio-i18n";
import { useAppDiagnosticText } from "./app-diagnostic-i18n";
import "./app-connections.css";
import { diagnoseConnections } from "./app-connections";
import Icon from "../../shared/ui/Icon";
export default function AppDiagnostics({
  manifest: m,
  onNavigate,
  onAssist,
}: {
  manifest: Manifest;
  onNavigate?: (tab: AppStudioKey) => void;
  onAssist?: (prompt: string) => void;
}) {
  const t = useAppDiagnosticText();
  const issues = diagnoseConnections(m);
  const rows = [
    {
      key: "surfaces",
      value: m.surfaces?.length ?? m.slots.length,
      tab: "design",
    },
    {
      key: "settings",
      value: m.settings?.filter((s) => s.required).length ?? 0,
      tab: "settings",
    },
    { key: "models", value: m.entities.length, tab: "data" },
    {
      key: "actions",
      value: m.actions?.filter((a) => a.mcp === true).length ?? 0,
      tab: "connect",
    },
    {
      key: "examples",
      value:
        (m.capability?.examples.length ?? 0) +
        (m.configuration?.inputs?.examples?.length ?? 0),
      tab: "capability",
    },
  ] as const;
  return (
    <section className="app-model-card app-diagnostics">
      <h2>
        <Icon name="check" size={18} /> {t("title")}
      </h2>
      <p>{t("hint")}</p>
      <div className="app-diagnostic-grid">
        {rows.map((row) => (
          <button
            key={row.key}
            type="button"
            className="studio-secondary"
            disabled={!onNavigate}
            onClick={() => onNavigate?.(row.tab)}
          >
            <strong>{row.value}</strong>
            <span>{t(row.key)}</span>
          </button>
        ))}
      </div>
      <h3>{t("connections")}</h3>
      {issues.length ? (
        <ul className="app-connection-issues">
          {issues.map((issue) => (
            <li key={`${issue.kind}:${issue.reference}`}>
              <button
                type="button"
                className="studio-secondary"
                disabled={!onNavigate}
                onClick={() => onNavigate?.(issue.tab)}
              >
                <span>
                  {t(issue.kind)}
                  <small>{issue.reference}</small>
                </span>
                <Icon name="arrow" size={16} />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p>{t("connectionsClear")}</p>
      )}
      <ol>
        {(["sandbox", "rights", "release"] as const).map((key) => (
          <li key={key}>{t(key)}</li>
        ))}
      </ol>
      {onAssist && (
        <button
          type="button"
          className="studio-secondary"
          onClick={() => onAssist(t("prompt"))}
        >
          <Icon name="spark" size={16} /> {t("assist")}
        </button>
      )}
    </section>
  );
}

/** Compact migration step navigation keeps source, reviewed domains and the native design handoff together. */
import { isPrivate, type Kind } from "./model";
import { useMigrationText } from "./i18n";
export default function MigrationSteps({
  rights,
  kind,
  busy,
  onSettings,
  onKind,
  onDesign,
}: {
  rights: string[];
  kind: Kind;
  busy: boolean;
  onSettings: () => void;
  onKind: (kind: Kind) => void;
  onDesign?: () => void | Promise<void>;
}) {
  const t = useMigrationText();
  return (
    <aside className="migration-steps">
      <strong>{t("connection")}</strong>
      <p>{t("noSecrets")}</p>
      <button className="studio-secondary" onClick={onSettings}>
        {t("settings")}
      </button>
      <strong>{t("review")}</strong>
      <div className="migration-domain-picker">
        {(
          [
            "products",
            "assets",
            "categories",
            "pages",
            "customers",
            "orders",
            "reviews",
            "coupons",
          ] as const
        ).map((k) => (
          <button
            key={k}
            aria-pressed={kind === k}
            disabled={
              !rights.includes(
                k === "coupons"
                  ? "automation.read"
                  : k === "reviews"
                    ? "catalog.read"
                    : k === "pages"
                      ? "channels.read"
                      : isPrivate(k)
                        ? "catalog.read"
                        : k === "orders"
                          ? "orders.read"
                          : "customers.read",
              ) ||
              (!isPrivate(k) &&
                k !== "coupons" &&
                !rights.includes("customers.pii"))
            }
            onClick={() => onKind(k)}
          >
            {t(k)}
          </button>
        ))}
      </div>
      <strong>{t("run")}</strong>
      <p>{t("private")}</p>
      {onDesign && rights.includes("channels.manage") && (
        <>
          <button
            className="studio-secondary"
            disabled={busy || !rights.includes("environments.manage")}
            onClick={onDesign}
          >
            {t("designer")}
          </button>
          <small>{t("designHint")}</small>
        </>
      )}
    </aside>
  );
}

/** Ten explicit service routes reuse native app consent or the documented HTTP setup; no fake connected state. */
import type { Package } from "./app-types";
import Icon from "../../shared/ui/Icon";
import { useIntegrationDirectoryText } from "./integration-directory-text";
import "../styles/service-integrations.css";
export const integrationRoutes = [
  { name: "Vercel", app: "vercel", kind: "frontend" },
  { name: "Shopware Nexus", app: "", kind: "http" },
  { name: "Shopware 6", app: "migration", kind: "products" },
  { name: "Shopify", app: "migration", kind: "import" },
  { name: "WooCommerce", app: "migration", kind: "import" },
  { name: "Klaviyo", app: "klaviyo", kind: "events" },
  { name: "HubSpot", app: "hubspot", kind: "contacts" },
  { name: "Slack", app: "slack", kind: "notifications" },
  { name: "Contentful", app: "contentful", kind: "knowledge" },
  { name: "Algolia", app: "algolia", kind: "search" },
] as const;
export default function IntegrationDirectory({
  packages,
  manage,
  busy,
  onOpen,
  onInstall,
}: {
  packages: Package[];
  manage: boolean;
  busy: boolean;
  onOpen: (id: string) => void;
  onInstall: (id: string) => void;
}) {
  const t = useIntegrationDirectoryText();
  return (
    <details className="integration-directory">
      <summary>
        <Icon name="globe" />
        {t("title")}
      </summary>
      <p>{t("intro")}</p>
      <div className="integration-directory-grid">
        {integrationRoutes.map((r) => {
          const installed = packages.some((p) => p.id === r.app);
          return (
            <article key={r.name}>
              <strong>{r.name}</strong>
              <p>{t(r.kind)}</p>
              {r.app ? (
                <button
                  className="studio-secondary"
                  disabled={busy || (!installed && !manage)}
                  onClick={() => {
                    if (r.app === "migration") {
                      const url = new URL(location.href);
                      url.searchParams.set(
                        "migrationSource",
                        r.name.toLowerCase().replaceAll(" ", ""),
                      );
                      history.replaceState(null, "", url);
                    }
                    installed ? onOpen(r.app) : onInstall(r.app);
                  }}
                >
                  {t(installed ? "open" : "setup")}
                </button>
              ) : (
                <a
                  href="https://www.veyndo.ai/docs/service-integrations.html#shopware-nexus"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {t("guide")}
                </a>
              )}
            </article>
          );
        })}
      </div>
    </details>
  );
}

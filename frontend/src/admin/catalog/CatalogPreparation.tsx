/** One paged native projection connects saved content and durable image jobs to their existing editors. */
import { useContext, useEffect, useMemo } from "react";
import AgenticGrid from "../../shared/grid/AgenticGrid";
import { useGridPage } from "../../shared/grid/useGridPage";
import { StudioContext } from "../shell/StudioContext";
import type { RequestFn } from "../shell/studio-types";
import { usePreparationText, type PreparationWord } from "./preparation-i18n";
import "../styles/catalog-preparation.css";
export default function CatalogPreparation({
  request,
  onOpen,
}: {
  request: RequestFn;
  onOpen: (id: string, tab: string) => void;
}) {
  const t = usePreparationText(),
    studio = useContext(StudioContext);
  const scoped = useMemo<RequestFn>(
    () =>
      (path, ...args) =>
        request(
          path.startsWith("/api/merchant/products?")
            ? `${path}&preparation=true`
            : path,
          ...args,
        ),
    [request],
  );
  const page = useGridPage(scoped, "/api/merchant/products");
  const waiting = page.rows.some((p) =>
    ["queued", "processing"].includes(p.preparation?.imageJob?.state),
  );
  useEffect(() => {
    if (!waiting) return;
    const timer = setInterval(page.onRefresh, 3000);
    return () => clearInterval(timer);
  }, [waiting, request]);
  const imageState = (p: any): PreparationWord => {
    const state = p.preparation?.imageJob?.state;
    if (["queued", "processing", "ready", "failed"].includes(state))
      return state;
    return p.media?.length ? "present" : "missing";
  };
  return (
    <section className="catalog-preparation">
      <p>{t("hint")}</p>
      <p className="catalog-preparation-hint">{t("translationHint")}</p>
      <div className="catalog-preparation-actions">
        {studio?.access.includes("settings.read") && (
          <button
            type="button"
            className="studio-secondary"
            onClick={() => {
              const url = new URL(location.href);
              url.searchParams.set("settings", "languages");
              history.replaceState(null, "", url);
              studio.selectTab("commerce");
            }}
          >
            {t("translations")}
          </button>
        )}
        {studio?.environment && studio.access.includes("environments.read") && (
          <button
            type="button"
            className="studio-secondary"
            onClick={() => studio.selectTab("environments")}
          >
            {t("publication")}
          </button>
        )}
      </div>
      <AgenticGrid
        id="catalog-preparation"
        title={t("title")}
        {...page}
        searchKey="search"
        rowKey={(p) => p.id}
        columns={[
          {
            id: "product",
            label: t("product"),
            sort: "name",
            render: (p) => (
              <button
                type="button"
                className="agent-grid-link"
                onClick={() => onOpen(p.id, "general")}
              >
                <span>
                  <strong>{p.name}</strong>
                  <small>
                    {p.productNumber} · {t("saved")}
                  </small>
                </span>
              </button>
            ),
          },
          {
            id: "texts",
            label: t("texts"),
            render: (p) => (
              <button
                type="button"
                className="catalog-preparation-step"
                onClick={() => onOpen(p.id, "general")}
              >
                {p.preparation ? (
                  <>
                    {p.preparation.locales.map((l: string) => (
                      <span key={l}>
                        {l} ·{" "}
                        {p.preparation.namedLocales.includes(l) ? "✓" : "—"} /{" "}
                        {p.preparation.describedLocales.includes(l) ? "✓" : "—"}
                      </span>
                    ))}
                  </>
                ) : (
                  t("unknown")
                )}
              </button>
            ),
          },
          {
            id: "images",
            label: t("images"),
            render: (p) => (
              <button
                type="button"
                className={`catalog-preparation-step is-${imageState(p)}`}
                onClick={() => onOpen(p.id, "media")}
              >
                {t(imageState(p))}
              </button>
            ),
          },
          {
            id: "review",
            label: t("review"),
            render: (p) => t(p.active ? "active" : "inactive"),
          },
        ]}
      />
    </section>
  );
}

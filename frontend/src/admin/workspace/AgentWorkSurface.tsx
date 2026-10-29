/** Reviewed composition binds real native views to the current Studio scope and private workspace preferences. */
import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import type {
  WorkspaceView,
  WorkspaceComponent,
} from "../../shared/grid/workspace-view";
import { admitWorkspaceView } from "../../shared/grid/workspace-view";
import type { GridCriteria } from "../../shared/grid/types";
import type { IntakeMode } from "../catalog/catalog-intake-model";
import { useGridAccess } from "../../shared/grid/useGridAccess";
import { useCatalogIntakeText } from "../../shared/i18n/catalog-intake-i18n";
import Icon from "../../shared/ui/Icon";
import ConfirmDialog from "../../shared/ui/ConfirmDialog";
import { useStudio } from "../shell/StudioContext";
import AgentViewDirectory from "./AgentViewDirectory";
import { pinWorkspaceView } from "./pin-workspace-view";
import { useCompositionText } from "./composition-i18n";
import "./composition.css";
const CatalogIntake = lazy(() => import("../catalog/CatalogIntake"));

export default function AgentWorkSurface({
  candidate,
  onClose,
}: {
  candidate: WorkspaceView;
  onClose: () => void;
}) {
  const studio = useStudio(),
    t = useCompositionText(),
    intakeText = useCatalogIntakeText();
  const {
    request,
    liveRequest,
    access,
    openEntity,
    tabLabel,
    token,
    workspace,
    environment,
    locale,
  } = studio;
  const resolved = useGridAccess(request);
  const rights = resolved.filter((right) => access.includes(right));
  const view = admitWorkspaceView(candidate, rights);
  const [criteria, setCriteria] = useState<GridCriteria>(candidate.criteria);
  const [cursor, setCursor] = useState("");
  const [components, setComponents] = useState<WorkspaceComponent[]>(
    candidate.components ?? ["records"],
  );
  const [selected, setSelected] = useState<string>();
  const dirty = useRef(false);
  const reportDirty = useCallback((value: boolean) => {
    dirty.current = value;
  }, []);
  const [pendingNavigation, setPendingNavigation] = useState<
    (() => void) | null
  >(null);
  const leave = (next: () => void) => {
    if (dirty.current) setPendingNavigation(() => next);
    else next();
  };
  const [intake, setIntake] = useState<IntakeMode>();
  const [saved, setSaved] = useState(false),
    [error, setError] = useState(false),
    [busy, setBusy] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null),
    alive = useRef(true),
    pinning = useRef(false);
  useEffect(() => {
    alive.current = true;
    const previous = document.activeElement as HTMLElement | null;
    if (dialog.current && !dialog.current.open) dialog.current.showModal();
    return () => {
      alive.current = false;
      previous?.focus();
    };
  }, []);
  const target =
    candidate.entity === "products" ? "productData" : candidate.entity;
  const title = tabLabel(target);
  const pin = async () => {
    if (!view || pinning.current) return;
    pinning.current = true;
    setBusy(true);
    setSaved(false);
    setError(false);
    try {
      await pinWorkspaceView(
        liveRequest,
        rights,
        title,
        { ...view, criteria, components },
        () => alive.current,
      );
      if (alive.current) setSaved(true);
    } catch {
      if (alive.current) setError(true);
    } finally {
      pinning.current = false;
      if (alive.current) setBusy(false);
    }
  };
  const toggle = (component: WorkspaceComponent) => {
    setComponents((current) =>
      current.includes(component)
        ? current.filter((c) => c !== component)
        : [...current, component],
    );
    setSaved(false);
  };
  return (
    <dialog
      ref={dialog}
      className="agent-work-surface"
      onCancel={(event) => {
        if (event.target !== event.currentTarget) return;
        event.preventDefault();
        leave(onClose);
      }}
    >
      <header className="agent-work-surface-heading">
        <div>
          <p>{t("title")}</p>
          <h2>{title}</h2>
          <span>
            <Icon name="check" size={14} />
            {t("current")}
          </span>
        </div>
        <button
          type="button"
          aria-label={t("close")}
          onClick={() => leave(onClose)}
        >
          <Icon name="close" />
        </button>
      </header>
      {view ? (
        <>
          <div className="agent-work-surface-toolbar">
            <div>
              {(
                [
                  "details",
                  ...(view.entity === "products" ? ["intake"] : []),
                ] as WorkspaceComponent[]
              ).map((component) => (
                <button
                  type="button"
                  key={component}
                  aria-pressed={components.includes(component)}
                  onClick={() => toggle(component)}
                >
                  <Icon name={component === "details" ? "box" : "plus"} />
                  {t(component)}
                </button>
              ))}
            </div>
            {busy && <p role="status">{t("loading")}</p>}
          </div>
          {saved && <p role="status">{t("saved")}</p>}
          {error && <p role="alert">{t("saveError")}</p>}
          <p className="agent-work-surface-privacy">{t("privacy")}</p>
          {components.includes("intake") &&
            rights.includes("catalog.write") && (
              <section className="agent-work-surface-intake">
                <h3>{t("intake")}</h3>
                {(["csv", "url", "demo"] as IntakeMode[]).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    disabled={
                      mode !== "csv" && !rights.includes("assistant.use")
                    }
                    onClick={() => setIntake(mode)}
                  >
                    <Icon
                      name={
                        mode === "csv"
                          ? "box"
                          : mode === "url"
                            ? "link"
                            : "spark"
                      }
                    />
                    {intakeText(mode)}
                  </button>
                ))}
              </section>
            )}
          <AgentViewDirectory
            onDirtyChange={reportDirty}
            onEntity={(tab, id) =>
              leave(() => {
                onClose();
                openEntity(tab, id);
              })
            }
            entity={view.entity}
            request={request}
            rights={rights}
            selected={selected}
            headers={{
              Authorization: `Bearer ${token}`,
              "x-tenant": environment || workspace,
              "x-commerce-locale": locale,
            }}
            queryState={{
              criteria,
              onCriteria: (v) => {
                setCriteria(v);
                setCursor("");
                setSaved(false);
              },
              cursor,
              onCursor: setCursor,
              onPin: () => void pin(),
            }}
            onSelect={(id) =>
              leave(() => {
                if (!id || components.includes("details")) setSelected(id);
                else {
                  onClose();
                  openEntity(target, id);
                }
              })
            }
          />
          {intake && (
            <Suspense fallback={<p role="status">{t("loading")}</p>}>
              <CatalogIntake
                initialMode={intake}
                onClose={() => setIntake(undefined)}
              />
            </Suspense>
          )}
        </>
      ) : (
        <p role="alert">{t("error")}</p>
      )}
      {pendingNavigation && (
        <ConfirmDialog
          title={t("discardTitle")}
          confirmLabel={t("discard")}
          onCancel={() => setPendingNavigation(null)}
          onConfirm={() => {
            const next = pendingNavigation;
            dirty.current = false;
            setPendingNavigation(null);
            next();
          }}
        >
          {t("discardBody")}
        </ConfirmDialog>
      )}
    </dialog>
  );
}

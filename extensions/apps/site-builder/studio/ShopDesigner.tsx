/** Three-panel standard-shop editor inside the native shell; Storyfront retains its separate original editor. */
import { useEffect, useRef, useState } from "react";
import type { RequestFn } from "../../../../frontend/src/shared/api/types";
import {
  ContentLanguage,
  useContentLanguage,
} from "../../../../frontend/src/shared/i18n/ContentLanguage";
import ConfirmDialog from "../../../../frontend/src/shared/ui/ConfirmDialog";
import Icon from "../../../../frontend/src/shared/ui/Icon";
import type { SiteProduct } from "../Renderer";
import DesignerPreview from "./DesignerPreview";
import { homeDraft } from "./home-draft";
import {
  inheritedTheme,
  effectivePages,
  explicitTheme,
  type Page,
} from "../model";
import { useDesignText } from "./design-i18n";
import { useEditorText } from "./editor-i18n";
import useDesigner, { type Designer } from "./useDesigner";
import PageTree from "./PageTree";
import usePageProducts from "../usePageProducts";
import DesignerInspector, { type DesignerMode } from "./DesignerInspector";
import DesignerHeader from "./DesignerHeader";
import type { HomeSnapshot } from "./StorefrontCanvas";
import "./designer.css";
import "./canvas.css";
import "./inspector.css";
import "./workspace.css";
import "./navigation.css";
import "./palette.css";
import { BlockEditingContext, useBlockEditing } from "./useBlockEditing";
import "./interactions.css";
import { PlacementStatus } from "./EditableSection";
import DesignSetup, { designIntent } from "./DesignSetup";
import useDesignResume from "./useDesignResume";
type Props = {
  request: RequestFn;
  workspace: string;
  shopName?: string;
  initialReference?: string;
  rights: string[];
  sandbox: boolean;
  onEnvironments: () => void;
  onSandbox?: (id: string, current?: () => boolean) => Promise<void>;
};
export default function ShopDesigner(props: Props) {
  const d = useDesigner(props.request, props.workspace);
  return d.context ? (
    <ContentLanguage
      locales={d.context.locales}
      mainLocale={d.context.mainLocale}
    >
      <DesignerView {...props} d={d} />
    </ContentLanguage>
  ) : (
    <section className="studio-page">
      <p role={d.error ? "alert" : "status"}>{d.error || "…"}</p>
      <button onClick={() => void d.load()}>↻</button>
    </section>
  );
}
function DesignerView({
  request,
  workspace,
  shopName,
  initialReference,
  rights,
  sandbox,
  onEnvironments,
  onSandbox,
  d,
}: Props & { d: Designer }) {
  const t = useDesignText(),
    e = useEditorText(),
    { language, mainLocale } = useContentLanguage();
  useEffect(() => {
    d.setCatalogueLanguage(language);
  }, [language]);
  const [device, setDevice] = useState<"desktop" | "tablet" | "mobile">(() =>
      window.matchMedia("(max-width: 650px)").matches ? "mobile" : "desktop",
    ),
    [showPages, setShowPages] = useState(false),
    [pending, setPending] = useState<Page>(),
    [pendingChannel, setPendingChannel] = useState<string>(),
    [pendingHome, setPendingHome] = useState(false);

  const [mode, setMode] = useState<DesignerMode>(
    initialReference || designIntent() === "agent"
      ? "agent"
      : designIntent() === "blocks"
        ? "blocks"
        : "edit",
  );
  const nativeSnapshot = useRef<HomeSnapshot | undefined>(undefined);
  const [snapshotScope, setSnapshotScope] = useState("");
  const scopeKey = `${workspace}:${d.channel}:${language}`;
  const [comparison, setComparison] = useState<Page | null>(null);
  useEffect(() => setComparison(null), [workspace, d.channel, request]);
  const writable =
      sandbox &&
      rights.includes("channels.manage") &&
      d.context!.installed.includes("site_builder") &&
      d.context!.installed.includes("site_forms"),
    missing = ["site_builder", "site_forms"].find(
      (id) => !d.context!.installed.includes(id),
    );
  const open = (page: Page) => {
    if (d.dirty) setPending(page);
    else d.open(page);
    setComparison(null);
  };
  const beginSetup = useDesignResume({
    workspace,
    request,
    sandbox,
    writable,
    missing,
    d,
    language,
    mainLocale,
    nativeSnapshot,
    snapshotScope,
    scopeKey,
    setMode,
  });
  useEffect(() => {
    if (!d.loaded || d.draft) return;
    const pages = effectivePages(d.pages, d.channel);
    const home = pages.find(
      (p) => p.slug === "home" && p.status !== "archived",
    );
    if (home) d.open(home);
  }, [d.loaded, d.pages, d.channel, d.draft]);
  const customizeHome = (
    snapshot: HomeSnapshot,
    section: "hero" | "products",
  ) => {
    if (d.draft) return;
    if (!sandbox || missing) {
      beginSetup(section);
      return;
    }
    if (!writable) {
      d.setError(t("readOnly"));
      return;
    }
    const page = homeDraft(
      d.channel,
      mainLocale,
      language,
      d.context!.catalogue.elements,
      snapshot,
    );
    d.open(page);
    setMode("edit");
    d.setSelected(
      section === "hero"
        ? page.content.blocks[0].id
        : page.content.blocks[1].id,
    );
  };
  const editing = useBlockEditing({
    d,
    enabled: writable && !comparison,
    scope: `${workspace}:${d.channel}:${language}`,
    prepare: () =>
      nativeSnapshot.current
        ? homeDraft(
            d.channel,
            mainLocale,
            language,
            d.context!.catalogue.elements,
            nativeSnapshot.current,
          )
        : undefined,
    onSelect: () => setMode("edit"),
  });
  const theme = {
    ...inheritedTheme(d.pages, d.channel),
    ...explicitTheme(d.draft?.theme),
  };
  const selection = usePageProducts(
    comparison ?? d.draft,
    d.context!.catalogue.elements,
    `${workspace}:${d.channel}:${language}`,
    async (ids) =>
      (
        await request(
          `/api/merchant/site/context?channel=${encodeURIComponent(d.channel)}&locale=${encodeURIComponent(language)}&ids=${encodeURIComponent(JSON.stringify(ids))}`,
        )
      ).catalogue.elements,
  );
  const setup =
    !writable || missing ? (
      <DesignSetup
        request={request}
        workspace={workspace}
        rights={rights}
        sandbox={sandbox}
        installed={d.context!.installed}
        loaded={d.loaded}
        onSandbox={onSandbox}
        onReload={d.load}
      />
    ) : null;
  return (
    <BlockEditingContext.Provider value={editing}>
      <div className="shop-designer">
        <DesignerHeader
          d={d}
          rights={rights}
          sandbox={sandbox}
          writable={writable}
          creating={false}
          selectionError={!!selection.error}
          onChannel={(channel) => {
            if (d.dirty) setPendingChannel(channel);
            else d.changeChannel(channel);
          }}
          onSandbox={() => beginSetup("edit")}
          onEnvironments={onEnvironments}
          onAgent={() => {
            if (!writable || missing) beginSetup("agent");
            else setMode("agent");
          }}
          agentOpen={mode === "agent"}
        />

        <div className={`designer-layout ${showPages ? "with-pages" : ""}`}>
          {showPages && (
            <PageTree
              d={d}
              writable={writable}
              onOpen={open}
              onAdd={() => setMode("blocks")}
              onEdit={() => setMode("edit")}
              onHome={() => {
                if (d.dirty) setPendingHome(true);
                else d.close();
              }}
            />
          )}
          <section className="designer-canvas">
            <div className="designer-preview-bar">
              <button
                aria-expanded={showPages}
                onClick={() => setShowPages(!showPages)}
              >
                <Icon name="menu" size={16} />
                {t("pagesToggle")}
              </button>
              <div role="group" aria-label={t("preview")}>
                {(["desktop", "tablet", "mobile"] as const).map((k) => (
                  <button
                    key={k}
                    aria-pressed={device === k}
                    onClick={() => setDevice(k)}
                  >
                    {t(k)}
                  </button>
                ))}
              </div>
              <button
                aria-label={t("undo")}
                disabled={!writable || !d.canUndo}
                onClick={d.undo}
              >
                ↶
              </button>
              <button
                aria-label={t("redo")}
                disabled={!writable || !d.canRedo}
                onClick={d.redo}
              >
                ↷
              </button>
              <PlacementStatus page={d.draft} />
            </div>
            <DesignerPreview
              d={d}
              request={request}
              workspace={workspace}
              shopName={shopName}
              language={language}
              mainLocale={mainLocale}
              device={device}
              theme={theme}
              products={selection.products as SiteProduct[]}
              comparison={comparison}
              writable={writable}
              onHome={customizeHome}
              onSnapshot={(snapshot) => {
                nativeSnapshot.current = snapshot;
                setSnapshotScope(scopeKey);
              }}
              onEdit={() => setMode("edit")}
            />
          </section>
          <DesignerInspector
            initialReference={initialReference}
            onViewport={setDevice}
            scopeKey={`${workspace}:${d.channel}`}
            d={d}
            request={request}
            rights={rights}
            writable={writable}
            theme={theme}
            products={selection.products}
            setShowPages={setShowPages}
            setup={setup}
            mode={mode}
            onMode={(next) => {
              if (!writable || missing)
                beginSetup(next === "history" ? "edit" : next);
              else setMode(next);
            }}
            onPrepare={async () => {
              if (!writable) {
                beginSetup("edit");
                return;
              }
              if (
                d.draft?.revision &&
                !d.dirty &&
                (d.draft.channel !== "*" || d.channel === "*")
              )
                return d.draft;
              const candidate =
                d.draft ??
                (nativeSnapshot.current
                  ? homeDraft(
                      d.channel,
                      mainLocale,
                      language,
                      d.context!.catalogue.elements,
                      nativeSnapshot.current,
                    )
                  : undefined);
              if (!candidate) {
                d.setError(e("unavailable"));
                return;
              }
              return d.save(candidate);
            }}
            onPreview={setComparison}
          />
        </div>
        {(pending || pendingHome || pendingChannel !== undefined) && (
          <ConfirmDialog
            title={t("discardTitle")}
            onCancel={() => {
              setPending(undefined);
              setPendingHome(false);
              setPendingChannel(undefined);
            }}
            onConfirm={() => {
              if (pending) d.open(pending);
              if (pendingHome) d.close();
              setPendingHome(false);
              if (pendingChannel !== undefined) d.changeChannel(pendingChannel);
              setPendingChannel(undefined);
              setPending(undefined);
            }}
            confirmLabel={t("discardTitle")}
          >
            <p>{t("discardHint")}</p>
          </ConfirmDialog>
        )}
      </div>
    </BlockEditingContext.Provider>
  );
}

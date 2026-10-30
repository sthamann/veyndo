/** Revision-aware product aggregate editor: one save, translation tabs and product-scoped linked capabilities. */
import { useCoreExtensions } from "../../shared/apps/CoreExtensions";
import { contentLocale } from "../../shared/i18n/content-language";
import { invalidProductSeo } from "../../shared/content/product-seo";
import { useProductSeoText } from "./product-seo-i18n";
import ProductEditorHeader from "./ProductEditorHeader";
import { useProductEditorText } from "./product-editor-i18n";
import "../styles/product-workspace.css";
import ProductCompliance from "../legal/ProductCompliance";
import { useLegalText } from "../../shared/i18n/legal-i18n";
import EntityHistory from "../../shared/history/EntityHistory";
import { ContentLanguage } from "../../shared/i18n/ContentLanguage";
import ProductEditorNav, { productTabs as tabs } from "./ProductEditorNav";
import { useEffect, useId, useRef, useState } from "react";
import { AppSurfaceView, useAppSurfaces } from "../../shared/apps/AppSurfaces";
import type { RequestFn } from "../shell/studio-types";
import { useCatalogText } from "../../shared/i18n/catalog-i18n";
import {
  hydrateDraft,
  productSavePayload,
  newDraft,
  type Category,
  type ProductDraft,
} from "./catalog-model";
import ProductMediaWorkspace from "./ProductMediaWorkspace";
import ProductEditorExtras from "./ProductEditorExtras";
import ProductPanels from "./ProductPanels";
import ProductAssets from "./ProductAssets";
import ReviewModeration from "./ReviewModeration";
import { EditorBuffer } from "../../shared/content/editor/EditorBuffer";
import ProductVariants from "./ProductVariants";
import RelatedProducts from "./RelatedProducts";
import { useUnsavedWorkspace } from "../../shared/ui/useUnsavedWorkspace";
export default function ProductEditor({
  id,
  request,
  categories,
  onBack,
  onCreated,
  canWrite = true,
  initialTab = "general",
  onDirtyChange,
}: {
  onDirtyChange?: (dirty: boolean) => void;
  canWrite?: boolean;
  initialTab?: string;
  id: string;
  request: RequestFn;
  categories: Category[];
  onBack: () => void;
  onCreated: (id: string) => void;
}) {
  const { c, locale } = useCatalogText();
  const appTabs = useAppSurfaces().filter(
    (s) => s.surface.location === "admin.product.tab",
  );
  const e = useProductEditorText(),
    seoText = useProductSeoText();
  const panelId = useId();
  const { l } = useLegalText();
  const [draft, setDraft] = useState<ProductDraft>(newDraft);
  const [extensions, setExtensions] = useCoreExtensions();
  const [reloadIndex, setReloadIndex] = useState(0);
  const [baseline, setBaseline] = useState("");
  const [lang, setLang] = useState(locale.slice(0, 2));
  const [tab, setTab] = useState(initialTab);
  const selectedApp = appTabs.find(
    (s) => tab === `app:${s.app}:${s.surface.id}`,
  );
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(!!id);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [editorPending, setEditorPending] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const currentRequest = useRef(request);
  currentRequest.current = request;
  useEffect(() => {
    let active = true;
    if (!id) {
      const d = newDraft();
      setDraft(d);
      setBaseline(JSON.stringify(d));
      currentRequest
        .current("/api/merchant/commerce")
        .then((v) => {
          if (active && v.data?.locales) {
            const configure = (old: ProductDraft): ProductDraft => ({
              ...old,
              extra: {
                ...old.extra,
                priceCurrency: v.data.currencies?.baseCurrency ?? "EUR",
              },
              mainLocale: v.data.mainLocale,
              availableLocales: v.data.locales,
              translations: Object.fromEntries(
                v.data.locales.map((l: string) => {
                  const base = l.split("-")[0],
                    key =
                      v.data.locales.filter(
                        (x: string) => x.split("-")[0] === base,
                      ).length === 1
                        ? base
                        : l;
                  return [
                    key,
                    old.translations[key] ?? { name: null, description: null },
                  ];
                }),
              ),
            });
            setDraft(configure);
            setBaseline(JSON.stringify(configure(d)));
          }
        })
        .catch(() => {});
      return () => {
        active = false;
      };
    }
    setLoading(true);
    currentRequest
      .current(`/api/merchant/products/${id}`)
      .then((v) => {
        if (active) {
          setExtensions(v);
          const d = hydrateDraft(v);
          setDraft(d);
          setBaseline(JSON.stringify(d));
        }
      })
      .catch((e) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
    // All translations are loaded together; a UI locale change must not
    // overwrite a draft. Merchant's boundary remounts on shop/environment changes.
  }, [id, reloadIndex]);
  const dirty = JSON.stringify(draft) !== baseline || editorPending;
  useUnsavedWorkspace(dirty, onDirtyChange);
  const change = (d: ProductDraft) => {
    if (!canWrite) return;
    setDraft(d);
    setSaved(false);
  };
  const save = async () => {
    if (!canWrite) return;
    if (invalidProductSeo(draft.extra.seo)) {
      setError(seoText("invalid"));
      return;
    }
    setBusy(true);
    setError("");
    try {
      const translations = { ...draft.translations };
      const payload = productSavePayload({ ...draft, translations }, baseline);
      const result = await request(
        id ? `/api/merchant/products/${id}` : "/api/merchant/products",
        payload,
        id ? "PUT" : "POST",
      );
      const next = {
        ...draft,
        translations,
        id: result.id,
        revision: result.revision,
        contentRevision: result.contentRevision ?? draft.contentRevision,
        commerce: {
          ...draft.commerce,
          stock: result.stock ?? draft.commerce.stock,
        },
      };
      setDraft(next);
      setBaseline(JSON.stringify(next));
      setSaved(true);
      if (!id) onCreated(result.id);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const enabledLocales = draft.availableLocales ?? [
    "en-GB",
    "de-DE",
    "fr-FR",
    "es-ES",
  ];
  const languageKeys = enabledLocales.map((l) =>
    enabledLocales.filter((v) => v.split("-")[0] === l.split("-")[0]).length ===
    1
      ? l.split("-")[0]
      : l,
  );
  const safeLang = languageKeys.includes(lang) ? lang : languageKeys[0];
  useEffect(() => {
    if (!languageKeys.includes(lang)) setLang(languageKeys[0]);
  }, [languageKeys.join(","), lang]);
  if (loading) return <p role="status">{c("loading")}</p>;
  return (
    <ContentLanguage
      locales={languageKeys}
      mainLocale={
        languageKeys[enabledLocales.indexOf(draft.mainLocale ?? "en-GB")] ??
        languageKeys[0]
      }
      language={safeLang}
      onLanguageChange={(language) =>
        editorPending ? setError(c("unsaved")) : setLang(language)
      }
    >
      <EditorBuffer.Provider
        value={{ pending: editorPending, setPending: setEditorPending }}
      >
        <div className="studio-page catalog-workspace product-editor">
          <ProductEditorHeader
            draft={draft}
            id={id}
            lang={safeLang}
            saved={saved}
            canWrite={canWrite}
            busy={busy}
            editorPending={editorPending}
            dirty={dirty}
            change={change}
            save={save}
            onBack={() =>
              dirty || editorPending ? setLeaving(true) : onBack()
            }
          />
          {leaving && (
            <div className="catalog-unsaved" role="alert">
              <strong>{c("unsaved")}</strong>
              <button
                className="studio-secondary"
                onClick={() => setLeaving(false)}
              >
                {c("continue")}
              </button>
              <button
                className="studio-secondary"
                onClick={() => {
                  onDirtyChange?.(false);
                  onBack();
                }}
              >
                {c("discard")}
              </button>
            </div>
          )}
          {error && (
            <p role="alert" className="catalog-error">
              {error}
            </p>
          )}
          <div className="catalog-detail-layout">
            <ProductEditorNav
              tabs={tabs}
              panelId={panelId}
              tab={tab}
              id={id}
              onSelect={(next) =>
                editorPending ? setError(c("unsaved")) : setTab(next)
              }
            />
            <section
              className="studio-card catalog-detail-panel"
              role="tabpanel"
              id={panelId}
              aria-labelledby={`${panelId}-tab-${tab}`}
              tabIndex={0}
            >
              {!selectedApp && (
                <div className="product-editor-section-heading">
                  <h2>
                    {tab === "compliance"
                      ? l("compliance")
                      : c(tab as Parameters<typeof c>[0])}
                  </h2>
                  <p>{e(tab as Parameters<typeof e>[0])}</p>
                </div>
              )}
              <fieldset
                className="catalog-permission-fields"
                disabled={
                  !canWrite &&
                  !selectedApp &&
                  !["media", "variants", "assignments", "related"].includes(tab)
                }
              >
                {selectedApp ? (
                  <AppSurfaceView
                    selected={selectedApp}
                    context={{ productId: id }}
                  />
                ) : tab === "compliance" ? (
                  <ProductCompliance draft={draft} onChange={change} />
                ) : tab === "media" ? (
                  <ProductMediaWorkspace
                    canWrite={canWrite}
                    unsaved={JSON.stringify(draft) !== baseline}
                    draft={draft}
                    request={request}
                    onChange={change}
                  />
                ) : tab === "attachments" ? (
                  id ? (
                    <ProductAssets id={id} request={request} />
                  ) : (
                    <p>{c("createFirst")}</p>
                  )
                ) : tab === "reviews" ? (
                  id ? (
                    <ReviewModeration productId={id} request={request} />
                  ) : (
                    <p>{c("createFirst")}</p>
                  )
                ) : tab === "variants" ? (
                  id ? (
                    <ProductVariants
                      canWrite={canWrite}
                      draft={draft}
                      dirty={dirty}
                      onChange={change}
                      request={request}
                      onOpen={(child) =>
                        dirty ? setError(c("unsaved")) : onCreated(child)
                      }
                    />
                  ) : (
                    <p>{c("createFirst")}</p>
                  )
                ) : tab === "related" ? (
                  <RelatedProducts
                    canWrite={canWrite}
                    language={contentLocale(
                      lang,
                      draft.availableLocales ?? [draft.mainLocale ?? lang],
                    )}
                    request={request}
                    id={id}
                    value={draft.extra.crossSelling}
                    onChange={(crossSelling) =>
                      change({
                        ...draft,
                        extra: { ...draft.extra, crossSelling },
                      })
                    }
                  />
                ) : (
                  <ProductPanels
                    canWrite={canWrite}
                    request={request}
                    tab={tab}
                    draft={draft}
                    lang={safeLang}
                    categories={categories}
                    onChange={change}
                  />
                )}
              </fieldset>
              <ProductEditorExtras
                extensions={extensions}
                id={id}
                tab={tab}
                request={request}
                selectedApp={!!selectedApp}
              />
              {id && (
                <EntityHistory
                  request={request}
                  entity="product"
                  id={id}
                  revision={draft.revision}
                  dirty={dirty || busy}
                  onRestored={async () => setReloadIndex((v) => v + 1)}
                />
              )}
            </section>
          </div>
        </div>
      </EditorBuffer.Provider>
    </ContentLanguage>
  );
}

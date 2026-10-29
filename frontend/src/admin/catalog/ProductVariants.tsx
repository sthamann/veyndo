/** Native variant family browser with cursor pagination, explicit editing and a bounded creation wizard. */
import { useEffect, useState } from "react";
import type { RequestFn } from "../shell/studio-types";
import { useCatalogText } from "../../shared/i18n/catalog-i18n";
import { type ProductDraft } from "./catalog-model";
import PairFields from "./PairFields";
import VariantGenerator from "./VariantGenerator";
import Icon from "../../shared/ui/Icon";
import { useVariantText } from "./variant-i18n";
import "../styles/variants.css";
export default function ProductVariants({
  draft,
  request,
  onOpen,
  onChange,
  dirty = false,
  canWrite = true,
}: {
  canWrite?: boolean;
  draft: ProductDraft;
  request: RequestFn;
  onOpen: (id: string) => void;
  onChange: (draft: ProductDraft) => void;
  dirty?: boolean;
}) {
  const { c, money } = useCatalogText(),
    v = useVariantText();
  const [items, setItems] = useState<any[]>([]),
    [cursor, setCursor] = useState<string | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [reload, setReload] = useState(0);
  useEffect(() => {
    if (draft.catalog.parentId) return;
    let active = true;
    setItems([]);
    setCursor(null);
    setBusy(true);
    setError("");
    request(
      `/api/merchant/products?limit=50&parentId=${encodeURIComponent(draft.id!)}`,
    )
      .then((result) => {
        if (active) {
          setItems(result.elements);
          setCursor(result.nextCursor);
        }
      })
      .catch((e) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setBusy(false);
      });
    return () => {
      active = false;
    };
  }, [draft.id, draft.catalog.parentId, request, reload]);
  if (draft.catalog.parentId)
    return (
      <>
        <button
          type="button"
          className="studio-secondary"
          disabled={dirty}
          onClick={() => onOpen(draft.catalog.parentId!)}
        >
          {v("parent")}
        </button>
        <h3>{c("options")}</h3>
        <fieldset className="catalog-permission-fields" disabled={!canWrite}>
          <PairFields
            value={draft.catalog.options}
            onChange={(options) =>
              onChange({ ...draft, catalog: { ...draft.catalog, options } })
            }
          />
        </fieldset>
      </>
    );
  return (
    <div className="product-variants">
      <p className="variant-family-hint">{c("variantHint")}</p>
      {dirty && <p role="status">{c("unsaved")}</p>}
      {busy && <p role="status">{v("loading")}</p>}
      {!busy && !error && !items.length && (
        <div className="variant-empty">
          <Icon name="layers" size={28} />
          <h3>{v("empty")}</h3>
          <p>{v("emptyHint")}</p>
        </div>
      )}
      {!!items.length && (
        <h3 className="variant-family-title">
          {v("family")}{" "}
          <span>
            ({items.length}
            {cursor ? "+" : ""})
          </span>
        </h3>
      )}
      {items.map((p) => (
        <button
          type="button"
          className="catalog-variant"
          key={p.id}
          disabled={dirty || busy}
          onClick={() => onOpen(p.id)}
        >
          <span className="variant-identity">
            <strong>
              {Object.entries(p.options)
                .map(([k, value]) => `${k}: ${value}`)
                .join(" · ")}
            </strong>
            <span>
              {p.productNumber} · {money(p.price)} · {p.stock} {c("stock")}
            </span>
          </span>
          <span className="variant-open">
            {v("edit")} <Icon name="arrow" size={16} />
          </span>
        </button>
      ))}
      {cursor && (
        <button
          type="button"
          className="studio-secondary"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setError("");
            try {
              const result = await request(
                `/api/merchant/products?limit=50&parentId=${encodeURIComponent(draft.id!)}&after=${encodeURIComponent(cursor)}`,
              );
              setItems((old) => [...old, ...result.elements]);
              setCursor(result.nextCursor);
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          {v("more")}
        </button>
      )}
      {error && <p role="alert">{error}</p>}
      {canWrite && (
        <details className="variant-create">
          <summary>
            <Icon name="plus" size={18} />
            {v("start")}
          </summary>
          <fieldset
            className="catalog-permission-fields"
            disabled={dirty || busy}
          >
            <VariantGenerator
              parent={draft}
              request={request}
              onCreated={async () => setReload((n) => n + 1)}
            />
          </fieldset>
        </details>
      )}
    </div>
  );
}

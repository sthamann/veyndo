/** Ordered recommendations retain selected native records across cursor-paginated searches, content-language changes and read-only inspection. */
import { useEffect, useState } from "react";
import type { RequestFn } from "../shell/studio-types";
import { useRelatedProductsText } from "./related-products-i18n";
import RelatedProductRow from "./RelatedProductRow";
import "../styles/related-products.css";
type Choice = {
  id: string;
  name: string;
  productNumber?: string;
  active?: boolean;
  media?: { url: string }[];
};
export default function RelatedProducts({
  request,
  id,
  value,
  onChange,
  language = "en-GB",
  canWrite = true,
}: {
  request: RequestFn;
  id: string;
  value: string[];
  onChange: (ids: string[]) => void;
  language?: string;
  canWrite?: boolean;
}) {
  const t = useRelatedProductsText(),
    [search, setSearch] = useState(""),
    [cursor, setCursor] = useState(""),
    [retry, setRetry] = useState(0);
  const [result, setResult] = useState<{
    request: RequestFn;
    language: string;
    search: string;
    elements: Choice[];
    next?: string;
    error?: string;
    loading: boolean;
  }>();
  const current =
    result?.request === request &&
    result.language === language &&
    result.search === search
      ? result
      : undefined;
  const selected = [...new Set(value)],
    products = current?.elements ?? [];
  useEffect(() => {
    let active = true;
    setResult((old) => ({
      request,
      language,
      search,
      elements:
        cursor &&
        old?.request === request &&
        old.language === language &&
        old.search === search
          ? old.elements
          : [],
      loading: true,
    }));
    const timer = setTimeout(() => {
      request(
        `/api/merchant/products?limit=25&search=${encodeURIComponent(search)}${cursor ? `&after=${encodeURIComponent(cursor)}` : ""}`,
        undefined,
        undefined,
        { locale: language },
      )
        .then((v) => {
          if (active)
            setResult((old) => ({
              request,
              language,
              search,
              elements: [
                ...(cursor ? (old?.elements ?? []) : []),
                ...(v.elements ?? []),
              ],
              next: v.nextCursor ?? undefined,
              loading: false,
            }));
        })
        .catch((e) => {
          if (active)
            setResult((old) => ({
              request,
              language,
              search,
              elements: old?.elements ?? [],
              loading: false,
              error: e.message,
            }));
        });
    }, 200);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [request, language, search, cursor, retry]);
  const move = (index: number, offset: number) => {
    const next = [...selected];
    [next[index], next[index + offset]] = [next[index + offset], next[index]];
    onChange(next);
  };
  return (
    <div className="related-products-workspace">
      <p className="related-products-hint">{t("hint")}</p>
      <section aria-label={t("selected")}>
        <div className="related-products-heading">
          <h3>{t("selected")}</h3>
          <span>{t("count", { count: selected.length })}</span>
        </div>
        {selected.length ? (
          <ol className="related-products-selected">
            {selected.map((productId, index) => (
              <RelatedProductRow
                key={productId}
                id={productId}
                request={request}
                language={language}
                index={index}
                total={selected.length}
                disabled={!canWrite}
                onMove={(offset) => move(index, offset)}
                onRemove={() =>
                  onChange(selected.filter((v) => v !== productId))
                }
              />
            ))}
          </ol>
        ) : (
          <p className="related-products-hint">{t("empty")}</p>
        )}
      </section>
      <section aria-label={t("search")}>
        <label>
          {t("search")}
          <input
            type="search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCursor("");
            }}
          />
        </label>
        {selected.length >= 20 && (
          <p className="related-products-hint">{t("limit")}</p>
        )}
        <div
          className="related-products-results"
          aria-busy={!current || current.loading}
        >
          {products
            .filter((p) => p.id !== id)
            .map((p) => (
              <label key={p.id} className="related-product-choice">
                <input
                  type="checkbox"
                  checked={selected.includes(p.id)}
                  disabled={
                    !canWrite ||
                    (!selected.includes(p.id) && selected.length >= 20)
                  }
                  onChange={(e) =>
                    onChange(
                      e.target.checked
                        ? [...selected, p.id]
                        : selected.filter((v) => v !== p.id),
                    )
                  }
                />
                {p.media?.[0]?.url && (
                  <img src={p.media[0].url} alt="" width="36" height="36" />
                )}
                <span>
                  <strong>{p.name}</strong>
                  <small>
                    {p.productNumber ?? p.id}
                    {p.active === false ? ` · ${t("inactive")}` : ""}
                  </small>
                </span>
              </label>
            ))}
        </div>
        {(!current || current.loading) && (
          <p role="status" className="related-products-hint">
            {t("loading")}
          </p>
        )}
        {current?.error && (
          <div role="alert">
            <p>{current.error}</p>
            <button
              type="button"
              className="studio-secondary"
              onClick={() => setRetry((n) => n + 1)}
            >
              {t("retry")}
            </button>
          </div>
        )}
        {current &&
          !current.loading &&
          !current.error &&
          !products.some((p) => p.id !== id) && (
            <p className="related-products-hint">{t("noMatches")}</p>
          )}
        {current?.next && (
          <button
            type="button"
            className="studio-secondary"
            disabled={current.loading}
            onClick={() => setCursor(current.next!)}
          >
            {t("more")}
          </button>
        )}
      </section>
    </div>
  );
}

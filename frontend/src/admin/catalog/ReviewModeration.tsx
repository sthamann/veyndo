/** Product-scoped review publication; authoritative authorization stays in the API. */
import { useEffect, useState } from "react";
import type { RequestFn } from "../../shared/api/types";
import Icon from "../../shared/ui/Icon";
import { useProductEditorText } from "./product-editor-i18n";
import { useShopText } from "../../shared/i18n/shop-i18n";
type Review = {
  id: string;
  productId: string;
  author: string;
  title: string;
  content: string;
  rating: number;
  approved: boolean;
  sourceImport?: {
    source: string;
    sourceId: string;
    sourceShop: string;
  } | null;
};
export default function ReviewModeration({
  request,
  productId,
}: {
  request: RequestFn;
  productId: string;
}) {
  const { s } = useShopText();
  const e = useProductEditorText();
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setReviews([]);
    setError("");
    request("/api/merchant/commerce")
      .then((v) => {
        if (active)
          setReviews(
            v.reviews.filter((r: Review) => r.productId === productId),
          );
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
  }, [request, productId]);
  return (
    <section className="studio-card">
      <h2>{s("moderation")}</h2>
      <p>{s("reviewHint")}</p>
      {error && <p role="alert">{error}</p>}
      {!loading && !error && reviews.length === 0 && (
        <div className="product-review-empty">
          <Icon name="chat" />
          <strong>{e("noReviews")}</strong>
          <p>{e("reviewEmpty")}</p>
        </div>
      )}
      {reviews.map((r) => (
        <article className="commerce-review" key={r.id}>
          <div>
            <strong>{r.title}</strong>
            <small>
              {r.author} · {r.rating}/5
            </small>
            <p>{r.content}</p>
            {r.sourceImport && (
              <>
                <small>{s("importedReview")}</small>
                <details>
                  <summary>{s("reviewSource")}</summary>
                  <p>
                    {r.sourceImport.source} · {r.sourceImport.sourceShop} ·{" "}
                    {r.sourceImport.sourceId}
                  </p>
                </details>
              </>
            )}
          </div>
          <button
            className="studio-secondary"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              setError("");
              try {
                await request(
                  `/api/merchant/reviews/${r.id}`,
                  { approved: !r.approved },
                  "PUT",
                );
                setReviews((rows) =>
                  rows.map((v) =>
                    v.id === r.id ? { ...v, approved: !r.approved } : v,
                  ),
                );
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            {s(r.approved ? "hide" : "approve")}
          </button>
        </article>
      ))}
    </section>
  );
}

/** ProductReviews: focused pdp-reviews view with explicit typed inputs and callbacks. */
import { useShopText } from "../../shared/i18n/shop-i18n";

import PublishedReviews from "./PublishedReviews";
import { shopApi } from "../../shared/api/shop-api";
export type ProductReviewsProps = {
  s: ReturnType<typeof useShopText>["s"];
  data: import("../../shared/api/shop-api").Detail;
  reviewed: boolean;
  cart: import("../../shared/api/shop-api").Cart | undefined;
  setSending: React.Dispatch<React.SetStateAction<boolean>>;
  setError: React.Dispatch<React.SetStateAction<string>>;
  id: string;
  setReviewed: React.Dispatch<React.SetStateAction<boolean>>;
  sending: boolean;
  error: string;
};
export default function ProductReviews({
  s,
  data,
  reviewed,
  cart,
  setSending,
  setError,
  id,
  setReviewed,
  sending,
  error,
}: ProductReviewsProps) {
  return (
    <section className="pdp-reviews" id="product-reviews">
      <PublishedReviews reviews={data.reviews} />
      <div className="review-form">
        <h3>{s("review")}</h3>
        {reviewed ? (
          <p role="status">{s("pending")}</p>
        ) : (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!cart) return;
              setSending(true);
              setError("");
              const form = new FormData(e.currentTarget);
              try {
                await shopApi(
                  `/store-api/product/${id}/reviews`,
                  {
                    author: form.get("author"),
                    rating: Number(form.get("rating")),
                    title: form.get("title"),
                    content: form.get("content"),
                  },
                  cart.token,
                );
                setReviewed(true);
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setSending(false);
              }
            }}
          >
            <label>
              {s("author")}
              <input name="author" required maxLength={80} />
            </label>
            <label>
              {s("rating")}
              <select name="rating" defaultValue="5">
                {[5, 4, 3, 2, 1].map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </label>
            <label>
              {s("title")}
              <input name="title" required maxLength={120} />
            </label>
            <label>
              {s("content")}
              <textarea name="content" required maxLength={3000} rows={4} />
            </label>
            <button className="shop-primary" disabled={sending || !cart}>
              {s("sendReview")}
            </button>
            <small>{s("reviewHint")}</small>
          </form>
        )}
        {error && <p role="alert">{error}</p>}
      </div>
    </section>
  );
}

/** Published review presentation shared by the native shop and private design preview; no customer actions. */
import type { Detail } from "../../shared/api/shop-api";
import { useShopText } from "../../shared/i18n/shop-i18n";
export default function PublishedReviews({
  reviews,
}: {
  reviews: Detail["reviews"];
}) {
  const { s } = useShopText();
  return (
    <div>
      <h2>
        {s("reviews")} <span>{reviews.count}</span>
      </h2>
      {!reviews.count && <p>{s("noReviews")}</p>}
      {reviews.elements.map((r) => (
        <article className="review" key={r.id}>
          <div>
            <strong>{r.author}</strong>
            <span aria-label={`${r.rating} / 5`}>
              {"★".repeat(r.rating)}
              {"☆".repeat(5 - r.rating)}
            </span>
          </div>
          <h3>{r.title}</h3>
          <p>{r.content}</p>
          {r.verifiedPurchase && <small>{s("verified")}</small>}
          {r.demo && <small>{s("demoReview")}</small>}
          {r.imported && <small>{s("importedReview")}</small>}
        </article>
      ))}
    </div>
  );
}

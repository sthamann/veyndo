/** Editable suggestions reuse native cards; variants and app inputs stay on the native detail page. */
import type { Product } from "../../shared/api/shop-api";
import { useExperienceUIText } from "../../shared/i18n/experience-ui-i18n";
import { useShopText } from "../../shared/i18n/shop-i18n";
import Icon from "../../shared/ui/Icon";
import { productURL } from "../catalog/product-url";
import ProductTile from "./ProductTile";
import "../styles/concierge-selection.css";

export default function ConciergeSelection({
  ids,
  removed,
  onRemove,
  onRestore,
  products,
  money,
  business = false,
}: {
  ids: string[];
  removed: readonly string[];
  onRemove: (id: string) => void;
  onRestore: () => void;
  products: Product[];
  money: (n: number) => string;
  business?: boolean;
}) {
  const { u } = useExperienceUIText();
  const { s } = useShopText();
  const selected = [...new Set(ids)]
    .slice(0, 12)
    .filter((id) => !removed.includes(id));
  return (
    <div className="concierge-selection">
      <header>
        <div>
          <h3>{u("yourSelection")}</h3>
          <p>{u("selectionHint")}</p>
        </div>
        {removed.length > 0 && (
          <button type="button" className="shop-secondary" onClick={onRestore}>
            {u("restoreSelection")}
          </button>
        )}
      </header>
      <div className="concierge-selection-grid">
        {selected.map((id) => {
          const product = products.find((p) => p.id === id);
          return (
            <div className="concierge-selection-item" key={id}>
              {product ? (
                <ProductTile
                  product={product}
                  money={money}
                  business={business}
                />
              ) : (
                <a className="shop-secondary" href={productURL({ id })}>
                  {s("details")} ↗
                </a>
              )}
              <button
                type="button"
                className="concierge-selection-remove"
                aria-label={`${u("removeSelection")}: ${product?.name ?? s("details")}`}
                onClick={() => onRemove(id)}
              >
                <Icon name="close" size={16} />
                {u("removeSelection")}
              </button>
            </div>
          );
        })}
      </div>
      {!selected.length && <p>{u("emptySelection")}</p>}
    </div>
  );
}

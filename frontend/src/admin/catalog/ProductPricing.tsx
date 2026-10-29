/** Grouped native pricing inputs preserve stock-safe aggregate saves and optional price contracts. */
import {
  useCatalogText,
  type CatalogWord,
} from "../../shared/i18n/catalog-i18n";
import type { ProductDraft } from "./catalog-model";
import type { RequestFn } from "../shell/studio-types";
import TaxClassSelect from "./TaxClassSelect";
import ProductCurrencyPrices from "./ProductCurrencyPrices";
import ReferencePriceFields from "./ReferencePriceFields";
import ProductPriceTiers from "./ProductPriceTiers";
import { useProductPricingText } from "./product-pricing-i18n";
import "../styles/product-pricing.css";

export default function ProductPricing({
  request,
  draft: d,
  onChange,
}: {
  request: RequestFn;
  draft: ProductDraft;
  onChange: (draft: ProductDraft) => void;
}) {
  const { c } = useCatalogText();
  const p = useProductPricingText();
  const field = (key: string, label: CatalogWord, optional = false) => (
    <label key={key}>
      {c(label)}
      <input
        type="number"
        min={0}
        step={
          ["price", "taxRate", "listPrice", "regulationPrice"].includes(key)
            ? "0.01"
            : "1"
        }
        value={d.commerce[key] ?? ""}
        onChange={(e) =>
          onChange({
            ...d,
            commerce: {
              ...d.commerce,
              [key]:
                optional && e.target.value === ""
                  ? null
                  : Number(e.target.value),
            },
          })
        }
      />
    </label>
  );
  return (
    <div className="product-pricing">
      <fieldset className="product-pricing-section">
        <legend>{p("sale")}</legend>
        <p>
          {p("saleHint").replace("{currency}", d.extra.priceCurrency ?? "EUR")}
        </p>
        <div className="catalog-form-grid product-pricing-main">
          {field("price", "price")}
          {field("taxRate", "tax")}
          <TaxClassSelect
            request={request}
            value={d.extra.taxClassId ?? ""}
            onChange={(taxClassId) =>
              onChange({
                ...d,
                extra: { ...d.extra, taxClassId: taxClassId || null },
              })
            }
          />
        </div>
      </fieldset>
      <fieldset className="product-pricing-section">
        <legend>{p("availability")}</legend>
        <p>{p("availabilityHint")}</p>
        <div className="catalog-form-grid">
          {field("stock", "stock")}
          {field("deliveryDays", "delivery")}
        </div>
      </fieldset>
      <details
        className="product-pricing-options"
        open={
          d.commerce.listPrice != null || d.commerce.regulationPrice != null
        }
      >
        <summary>{p("comparison")}</summary>
        <p>{p("comparisonHint")}</p>
        <div className="catalog-form-grid">
          {field("listPrice", "listPrice", true)}
          {field("regulationPrice", "regulationPrice", true)}
        </div>
      </details>
      <details
        className="product-pricing-options"
        open={
          d.commerce.minPurchase !== 1 ||
          d.commerce.purchaseSteps !== 1 ||
          d.commerce.maxPurchase != null
        }
      >
        <summary>{p("quantities")}</summary>
        <p>{p("quantitiesHint")}</p>
        <div className="catalog-form-grid product-pricing-quantities">
          {field("minPurchase", "min")}
          {field("purchaseSteps", "steps")}
          {field("maxPurchase", "max", true)}
        </div>
      </details>
      <details
        className="product-pricing-options"
        open={!!d.commerce.referencePrice}
      >
        <summary>{c("referencePrice")}</summary>
        <ReferencePriceFields
          draft={d}
          onChange={onChange}
          showHeading={false}
        />
      </details>
      <details
        className="product-pricing-options"
        open={Object.keys(d.extra.currencyPrices ?? {}).length > 0}
      >
        <summary>{p("currencies")}</summary>
        <ProductCurrencyPrices
          request={request}
          draft={d}
          onChange={onChange}
        />
      </details>
      <details
        className="product-pricing-options"
        open={d.commerce.advancedPrices.length > 0}
      >
        <summary>{c("tiers")}</summary>
        <p>{p("tiersHint")}</p>
        <ProductPriceTiers draft={d} onChange={onChange} />
      </details>
    </div>
  );
}

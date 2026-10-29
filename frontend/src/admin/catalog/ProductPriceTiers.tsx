/** Native rule-bound price tiers edit the existing revisioned product aggregate. */
import { useCatalogText } from "../../shared/i18n/catalog-i18n";
import type { ProductDraft } from "./catalog-model";
export default function ProductPriceTiers({
  draft: d,
  onChange,
}: {
  draft: ProductDraft;
  onChange: (draft: ProductDraft) => void;
}) {
  const { c } = useCatalogText();
  return (
    <>
      {d.commerce.advancedPrices.map((tier: any, i: number) => (
        <div className="catalog-form-grid catalog-tier" key={i}>
          {(
            ["rule_id", "quantity_start", "quantity_end", "discount"] as const
          ).map((k, j) => (
            <label key={k}>
              {c((["rule", "from", "to", "discount"] as const)[j])}
              <input
                type={j ? "number" : "text"}
                min={0}
                max={k === "discount" ? 100 : undefined}
                step={k === "discount" ? "0.01" : "1"}
                value={k === "discount" ? tier[k] * 100 : (tier[k] ?? "")}
                onChange={(e) =>
                  onChange({
                    ...d,
                    commerce: {
                      ...d.commerce,
                      advancedPrices: d.commerce.advancedPrices.map(
                        (v: any, n: number) =>
                          n === i
                            ? {
                                ...v,
                                [k]: j
                                  ? k === "quantity_end" &&
                                    e.target.value === ""
                                    ? null
                                    : Number(e.target.value) /
                                      (k === "discount" ? 100 : 1)
                                  : e.target.value,
                              }
                            : v,
                      ),
                    },
                  })
                }
              />
            </label>
          ))}
          <button
            type="button"
            className="studio-secondary"
            onClick={() =>
              onChange({
                ...d,
                commerce: {
                  ...d.commerce,
                  advancedPrices: d.commerce.advancedPrices.filter(
                    (_: any, n: number) => n !== i,
                  ),
                },
              })
            }
          >
            {c("remove")}
          </button>
        </div>
      ))}
      <button
        type="button"
        className="studio-secondary"
        onClick={() =>
          onChange({
            ...d,
            commerce: {
              ...d.commerce,
              advancedPrices: [
                ...d.commerce.advancedPrices,
                {
                  rule_id: "",
                  quantity_start: 1,
                  quantity_end: null,
                  discount: 0,
                },
              ],
            },
          })
        }
      >
        + {c("add")}
      </button>
    </>
  );
}

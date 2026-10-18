/** Source-specific input remains a compact part of the existing reviewed catalogue intake. */
import { useCatalogIntakeText } from "../../shared/i18n/catalog-intake-i18n";
import { csvTemplate, type IntakeMode } from "./catalog-intake-model";
export default function CatalogIntakeSource({
  mode,
  busy,
  source,
  setSource,
  file,
  fileName,
  shopDomain,
  setShopDomain,
  count,
  setCount,
}: {
  mode: IntakeMode;
  busy: boolean;
  source: string;
  setSource: (value: string) => void;
  file: (file?: File) => Promise<void>;
  fileName: string;
  shopDomain: string;
  setShopDomain: (value: string) => void;
  count: number;
  setCount: (value: number) => void;
}) {
  const c = useCatalogIntakeText();
  return (
    <>
      {mode === "csv" || mode === "shopify_csv" ? (
        <section className="catalog-intake-source">
          <label>
            {c(mode)}
            <input
              type="file"
              accept=".csv,text/csv"
              disabled={busy}
              onChange={(e) => {
                void file(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </label>
          <p>{c(mode === "shopify_csv" ? "shopifyHint" : "csvHint")}</p>
          {mode === "csv" && (
            <a
              download="products.csv"
              href={`data:text/csv;charset=utf-8,${encodeURIComponent(csvTemplate)}`}
            >
              {c("template")}
            </a>
          )}
          {fileName && <p role="status">{fileName}</p>}
        </section>
      ) : (
        <section className="catalog-intake-source">
          <label>
            {c(
              mode === "demo"
                ? "brief"
                : mode === "shop_mcp"
                  ? "supplierQuery"
                  : "source",
            )}
            {mode === "url" || mode === "shop_mcp" ? (
              <input
                type={mode === "url" ? "url" : "search"}
                value={source}
                maxLength={2000}
                placeholder={c(
                  mode === "url" ? "urlPlaceholder" : "supplierPlaceholder",
                )}
                disabled={busy}
                onChange={(e) => setSource(e.target.value)}
              />
            ) : (
              <textarea
                rows={4}
                value={source}
                maxLength={8000}
                placeholder={c("briefPlaceholder")}
                disabled={busy}
                onChange={(e) => setSource(e.target.value)}
              />
            )}
          </label>
          <p>
            {c(
              mode === "demo"
                ? "demoHint"
                : mode === "shop_mcp"
                  ? "supplierHint"
                  : "urlHint",
            )}
          </p>
          {mode === "shop_mcp" && (
            <label>
              {c("supplierShop")}
              <input
                value={shopDomain}
                maxLength={253}
                disabled={busy}
                onChange={(e) => setShopDomain(e.target.value)}
              />
            </label>
          )}
          <label>
            {c("count")}
            <input
              type="number"
              min="1"
              max="10"
              value={count}
              disabled={busy}
              onChange={(e) => setCount(Number(e.target.value))}
            />
          </label>
        </section>
      )}
    </>
  );
}

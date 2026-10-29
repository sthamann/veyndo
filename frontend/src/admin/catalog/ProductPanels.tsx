/** Native commerce, media, translated SEO/specifications and category panels for one editable product. */
import ProductPricing from "./ProductPricing";
import type { RequestFn } from "../shell/studio-types";
import { useCatalogText } from "../../shared/i18n/catalog-i18n";
import type { Category, ProductDraft } from "./catalog-model";
import PairFields from "./PairFields";

import {
  ProductRich,
  ProductSeo,
  ProductSpecifications,
} from "./ProductLocalizedContent";
import ProductTextFields from "./ProductTextFields";
export default function ProductPanels({
  request,
  tab,
  draft,
  lang,
  categories,
  onChange,
  canWrite = true,
}: {
  canWrite?: boolean;
  request: RequestFn;
  tab: string;
  draft: ProductDraft;
  lang: string;
  categories: Category[];
  onChange: (d: ProductDraft) => void;
}) {
  const { c } = useCatalogText();
  const d = draft;
  const extra = (v: any) => onChange({ ...d, extra: { ...d.extra, ...v } });
  if (tab === "general")
    return (
      <>
        <ProductTextFields draft={d} lang={lang} onChange={onChange} />
        <h2>
          {c("rich")} · {lang.toUpperCase()}
        </h2>
        <ProductRich
          canWrite={canWrite}
          draft={d}
          lang={lang}
          onChange={onChange}
        />
        <div className="catalog-form-grid">
          {(["manufacturer", "manufacturerNumber", "ean"] as const).map((k) => (
            <label key={k}>
              {c(k)}
              <input
                value={d.extra.identity?.[k] ?? ""}
                onChange={(e) =>
                  extra({
                    identity: { ...d.extra.identity, [k]: e.target.value },
                  })
                }
              />
            </label>
          ))}
        </div>
        <div className="catalog-flags">
          {(["digital", "shippingFree"] as const).map((k) => (
            <label className="checkbox-label" key={k}>
              <input
                type="checkbox"
                checked={!!d.extra[k]}
                onChange={(e) => extra({ [k]: e.target.checked })}
              />
              {c(k)}
            </label>
          ))}
        </div>
      </>
    );
  if (tab === "prices")
    return (
      <ProductPricing request={request} draft={draft} onChange={onChange} />
    );
  if (tab === "assignments")
    return (
      <>
        <h2>{c("categories")}</h2>
        <p>{c("categoryHint")}</p>
        <div className="catalog-category-checks">
          {categories.map((cat) => (
            <label className="checkbox-label" key={cat.id}>
              <input
                type="checkbox"
                checked={d.catalog.categoryIds.includes(cat.id)}
                onChange={(e) =>
                  onChange({
                    ...d,
                    catalog: {
                      ...d.catalog,
                      categoryIds: e.target.checked
                        ? [...d.catalog.categoryIds, cat.id]
                        : d.catalog.categoryIds.filter((id) => id !== cat.id),
                    },
                  })
                }
              />
              {cat.data.translations[lang]?.name ??
                cat.data.translations.en.name}
            </label>
          ))}
        </div>
        <h2>{c("assignments")}</h2>
        <div className="catalog-category-checks">
          {d.channels?.map((channel) => (
            <label className="checkbox-label" key={channel.id}>
              <input
                type="checkbox"
                checked={
                  d.catalog.salesChannelIds?.includes(channel.id) ??
                  channel.visible
                }
                onChange={(e) => {
                  const ids =
                    d.catalog.salesChannelIds ??
                    d.channels!.filter((c) => c.visible).map((c) => c.id);
                  onChange({
                    ...d,
                    catalog: {
                      ...d.catalog,
                      salesChannelIds: e.target.checked
                        ? [...ids, channel.id]
                        : ids.filter((id) => id !== channel.id),
                    },
                  });
                }}
              />
              {channel.data.name[lang] ?? channel.data.name.en}
            </label>
          ))}
        </div>
        <p>{c("channelsHint")}</p>
      </>
    );
  if (tab === "specs")
    return (
      <>
        <h2>
          {c("specs")} · {lang.toUpperCase()}
        </h2>
        <ProductSpecifications draft={d} lang={lang} onChange={onChange} />
        <h2>{c("key")}</h2>
        <PairFields
          value={d.commerce.properties}
          onChange={(properties) =>
            onChange({ ...d, commerce: { ...d.commerce, properties } })
          }
        />
        <div className="catalog-form-grid">
          {(["weight", "width", "height", "length"] as const).map((k) => (
            <label key={k}>
              {c(k)}
              <input
                type="number"
                min={0}
                step="0.01"
                value={d.extra.automation?.[k] ?? ""}
                onChange={(e) => {
                  const automation = { ...d.extra.automation };
                  if (e.target.value === "") delete automation[k];
                  else automation[k] = Number(e.target.value);
                  extra({ automation });
                }}
              />
            </label>
          ))}
        </div>
      </>
    );
  if (tab === "seo")
    return <ProductSeo draft={d} lang={lang} onChange={onChange} />;
  return null;
}

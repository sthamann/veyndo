/** A selected product resolves through the native merchant read; missing/forbidden records remain explicitly removable without losing the selection. */
import { useEffect, useState } from "react";
import type { RequestFn } from "../shell/studio-types";
import { hydrateDraft, productName } from "./catalog-model";
import Icon from "../../shared/ui/Icon";
import { useRelatedProductsText } from "./related-products-i18n";
export default function RelatedProductRow({
  id,
  request,
  language,
  index,
  total,
  disabled,
  onMove,
  onRemove,
}: {
  id: string;
  request: RequestFn;
  language: string;
  index: number;
  total: number;
  disabled: boolean;
  onMove: (offset: number) => void;
  onRemove: () => void;
}) {
  const t = useRelatedProductsText(),
    [loaded, setLoaded] = useState<{
      request: RequestFn;
      language: string;
      name: string;
      number: string;
      image?: string;
      active?: boolean;
      failed?: boolean;
    }>();
  useEffect(() => {
    let active = true;
    request(
      `/api/merchant/products/${encodeURIComponent(id)}`,
      undefined,
      undefined,
      { locale: language },
    )
      .then((v) => {
        if (active) {
          const d = hydrateDraft(v);
          setLoaded({
            request,
            language,
            name: productName(d, language) || id,
            number: d.catalog.productNumber,
            image: d.commerce.media?.[0]?.url,
            active: d.catalog.active,
          });
        }
      })
      .catch(() => {
        if (active)
          setLoaded({
            request,
            language,
            name: t("missing"),
            number: id,
            failed: true,
          });
      });
    return () => {
      active = false;
    };
  }, [id, request, language]);
  const data =
      loaded?.request === request && loaded.language === language
        ? loaded
        : undefined,
    name = data?.name ?? t("loading");
  return (
    <li className="related-product-row">
      <span className="related-product-position">{index + 1}</span>
      {data?.image ? (
        <img src={data.image} alt="" width="44" height="44" />
      ) : (
        <Icon name="box" />
      )}
      <div className="related-product-name">
        <strong>{name}</strong>
        <small>{data?.number ?? id}</small>
        {data?.active === false && !data.failed && (
          <small>{t("inactive")}</small>
        )}
      </div>
      <div className="related-product-actions">
        <button
          type="button"
          className="studio-secondary related-product-earlier"
          disabled={disabled || index === 0}
          aria-label={t("earlier", { name })}
          onClick={() => onMove(-1)}
        >
          <Icon name="arrow" />
        </button>
        <button
          type="button"
          className="studio-secondary related-product-later"
          disabled={disabled || index === total - 1}
          aria-label={t("later", { name })}
          onClick={() => onMove(1)}
        >
          <Icon name="arrow" />
        </button>
        <button
          type="button"
          className="studio-secondary"
          disabled={disabled}
          aria-label={t("remove", { name })}
          onClick={onRemove}
        >
          <Icon name="close" />
        </button>
      </div>
    </li>
  );
}

/** Keep editable recommendations across product navigation within the original buyer/channel context. */
import { useCallback, useState } from "react";
import type { Cart } from "../../shared/api/shop-api";
export type ShopperAdvice = { explanation: string; recommended_ids: string[] };
export function useShopperAdvice(
  tenant: string,
  channel: string,
  locale: string,
  cart?: Cart,
) {
  const scope = JSON.stringify([
    tenant,
    channel,
    locale,
    cart?.customerId,
    cart?.customerGroup,
    cart?.b2b?.unitId,
    cart?.checkout.country,
    cart?.price.currency,
  ]);
  const [saved, setSaved] = useState<{
    scope: string;
    answer: ShopperAdvice;
    removed: string[];
  }>();
  const setAdvice = useCallback(
    (answer?: ShopperAdvice) =>
      setSaved(answer ? { scope, answer, removed: [] } : undefined),
    [scope],
  );
  const remove = useCallback(
    (id: string) =>
      setSaved((previous) =>
        previous?.scope === scope
          ? { ...previous, removed: [...new Set([...previous.removed, id])] }
          : previous,
      ),
    [scope],
  );
  const restore = useCallback(
    () =>
      setSaved((previous) =>
        previous?.scope === scope ? { ...previous, removed: [] } : previous,
      ),
    [scope],
  );
  return [
    saved?.scope === scope ? saved.answer : undefined,
    setAdvice,
    scope,
    { removed: saved?.scope === scope ? saved.removed : [], remove, restore },
  ] as const;
}

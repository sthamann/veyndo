/** Share current native cart commands with UI/browser agents; registration is scoped and removed when the storefront changes. */
import { useEffect, useMemo, useRef } from "react";
import { shopApi, type Cart } from "../../shared/api/shop-api";
import {
  createStorefrontActions,
  registerStorefrontTools,
  type BrowserModelContext,
} from "./storefront-actions";
import { channelPreview } from "./ChannelPreview";
export function useStorefrontActions(
  cart: Cart | undefined,
  save: (cart: Cart) => void,
  review: () => void,
  key: string,
  session: string,
  locale: string,
) {
  const scope = useMemo(() => ({ cart, save, review }), [key]);
  scope.cart = cart;
  scope.save = save;
  scope.review = review;
  const currentScope = useRef(scope),
    mounted = useRef(true);
  currentScope.current = scope;
  const actions = useMemo(
    () =>
      createStorefrontActions({
        request: shopApi,
        getCart: () => scope.cart,
        saveCart: (next) => {
          scope.cart = next;
          scope.save(next);
        },
        reviewCheckout: () => scope.review(),
        session,
        active: () => mounted.current && currentScope.current === scope,
      }),
    [scope],
  );
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    if (channelPreview()) return;
    const context = (
      document as Document & { modelContext?: BrowserModelContext }
    ).modelContext;
    if (context) return registerStorefrontTools(context, actions);
  }, [actions, locale]);
  return actions;
}

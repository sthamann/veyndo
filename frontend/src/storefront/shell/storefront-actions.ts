/** Shared native storefront commands for UI, apps and WebMCP; never expose capabilities or submit a financial order. */
import { storefrontActionText as text } from "./storefront-actions-i18n";
import type { Cart, Product } from "../../shared/api/shop-api";
type Request = <T>(
  path: string,
  body?: unknown,
  token?: string,
  method?: string,
) => Promise<T>;
type Owner = {
  request: Request;
  getCart: () => Cart | undefined;
  saveCart: (cart: Cart) => void;
  reviewCheckout: () => void;
  session?: string;
  active?: () => boolean;
};
function publicCart(cart: Cart | undefined) {
  if (!cart) return { items: [], currency: null, total: null };
  return {
    items: cart.lineItems.map((item) => ({
      id: item.id,
      name: item.label,
      quantity: item.quantity,
    })),
    currency: cart.price.currency,
    total: cart.price.totalPrice,
  };
}
export function createStorefrontActions(owner: Owner) {
  let serial: Promise<unknown> = Promise.resolve();
  function guard(signal?: AbortSignal) {
    if (owner.active?.() === false || signal?.aborted)
      throw new Error(text("scope"));
  }
  function mutate(
    change: (cart: Cart) => { id: string; quantity: number }[],
    create = false,
    signal?: AbortSignal,
  ) {
    const execute = async () => {
      guard(signal);
      let cart = owner.getCart();
      if (create && (!cart || cart.status !== "open")) {
        cart = await owner.request<Cart>("/store-api/checkout/cart", {
          session: owner.session ?? "",
        });
        guard(signal);
        owner.saveCart(cart);
      }
      if (!cart || cart.status !== "open") throw new Error(text("open"));
      const items = change(cart);
      if (
        !Array.isArray(items) ||
        items.length > 100 ||
        items.some(
          (item) =>
            typeof item.id !== "string" ||
            !item.id ||
            item.id.length > 200 ||
            !Number.isInteger(item.quantity) ||
            item.quantity < 1 ||
            item.quantity > 10000,
        ) ||
        new Set(items.map((item) => item.id)).size !== items.length
      )
        throw new Error(text("items"));
      const next = await owner.request<Cart>(
        "/store-api/checkout/cart",
        { revision: cart.revision, items },
        cart.token,
        "PUT",
      );
      guard(signal);
      owner.saveCart(next);
      return publicCart(next);
    };
    const result = serial.then(execute);
    serial = result.catch(() => {});
    return result;
  }
  return {
    async searchCatalog(
      { query, limit = 10 }: { query: string; limit?: number },
      options?: { signal?: AbortSignal },
    ) {
      guard(options?.signal);
      if (
        typeof query !== "string" ||
        query.length > 200 ||
        !Number.isInteger(limit) ||
        limit < 1 ||
        limit > 50
      )
        throw new Error(text("query"));
      const page = await owner.request<{
        elements: Product[];
        nextCursor?: string | null;
      }>(
        "/store-api/product",
        { search: query, limit },
        owner.getCart()?.token,
      );
      guard(options?.signal);
      return {
        products: page.elements.map((p) => ({
          id: p.id,
          name: p.name,
          description: p.description,
          price: p.calculated_price?.unitPrice ?? p.price,
          currency: p.currency,
          media: p.media,
          options: p.options,
        })),
        nextCursor: page.nextCursor,
      };
    },
    getCart: () => {
      guard();
      return publicCart(owner.getCart());
    },
    updateCart(
      input: { items: { id: string; quantity: number }[] },
      options?: { signal?: AbortSignal },
    ) {
      return mutate(() => input.items, false, options?.signal);
    },
    setQuantity(id: string, quantity: number) {
      if (!Number.isInteger(quantity) || quantity < 0 || quantity > 10000)
        return Promise.reject(new Error(text("items")));
      return mutate((cart) =>
        cart.lineItems
          .map((item) => ({
            id: item.id,
            quantity: item.id === id ? quantity : item.quantity,
          }))
          .filter((item) => item.quantity > 0),
      );
    },
    addProduct(id: string, quantity: number) {
      if (!Number.isInteger(quantity) || quantity < 1 || quantity > 10000)
        return Promise.reject(new Error(text("items")));
      return mutate((cart) => {
        const items = cart.lineItems.map((item) => ({
          id: item.id,
          quantity: item.quantity,
        }));
        const item = items.find((item) => item.id === id);
        if (item) item.quantity += quantity;
        else items.push({ id, quantity });
        return items;
      }, true);
    },
    reviewCheckout: async (
      _input?: unknown,
      options?: { signal?: AbortSignal },
    ) => {
      guard(options?.signal);
      owner.reviewCheckout();
      return { requiresBuyerReview: true };
    },
  };
}
export type StorefrontActions = ReturnType<typeof createStorefrontActions>;
export type BrowserModelContext = {
  registerTool: (tool: unknown, options?: { signal: AbortSignal }) => unknown;
  unregisterTool?: (name: string) => unknown;
};
export function registerStorefrontTools(
  context: BrowserModelContext,
  actions: StorefrontActions,
) {
  const tools = [
    {
      name: "veyndo_search_catalog",
      description: text("search"),
      inputSchema: {
        type: "object",
        additionalProperties: false,
        properties: {
          query: { type: "string", maxLength: 200 },
          limit: { type: "integer", minimum: 1, maximum: 50 },
        },
        required: ["query"],
      },
      annotations: { readOnlyHint: true, untrustedContentHint: true },
      execute: actions.searchCatalog,
    },
    {
      name: "veyndo_get_cart",
      description: text("read"),
      inputSchema: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true },
      execute: actions.getCart,
    },
    {
      name: "veyndo_update_cart",
      description: text("update"),
      inputSchema: {
        type: "object",
        additionalProperties: false,
        properties: {
          items: {
            type: "array",
            maxItems: 100,
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                id: { type: "string", minLength: 1, maxLength: 200 },
                quantity: { type: "integer", minimum: 1, maximum: 10000 },
              },
              required: ["id", "quantity"],
            },
          },
        },
        required: ["items"],
      },
      annotations: { readOnlyHint: false, consequentialHint: false },
      execute: actions.updateCart,
    },
    {
      name: "veyndo_review_checkout",
      description: text("review"),
      inputSchema: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false },
      execute: actions.reviewCheckout,
    },
  ];
  const controller = new AbortController();
  try {
    for (const tool of tools) {
      Promise.resolve(
        context.registerTool(tool, { signal: controller.signal }),
      ).catch(() => controller.abort());
    }
  } catch {
    controller.abort();
  }
  return () => {
    controller.abort();
    for (const tool of tools) context.unregisterTool?.(tool.name);
  };
}

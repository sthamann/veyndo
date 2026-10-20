/** Stateless headless Store API client: every cart token is explicit and no merchant credential is accepted. */
export type CartHandle = { token: string; revision: number };
export function createVeyndoStorefront(
  config: {
    origin: string;
    checkoutOrigin?: string;
    shop: string;
    channel: string;
    locale: string;
  },
  transport: typeof fetch = fetch,
) {
  const origin = new URL(config.origin);
  if (
    (origin.protocol !== "https:" &&
      !(
        origin.protocol === "http:" &&
        ["127.0.0.1", "localhost"].includes(origin.hostname)
      )) ||
    origin.username ||
    origin.password ||
    origin.pathname !== "/" ||
    origin.search ||
    origin.hash
  )
    throw new Error(
      "Use the native Commerce origin without path or credentials",
    );
  const checkoutOrigin = new URL(config.checkoutOrigin ?? config.origin);
  if (
    checkoutOrigin.protocol !== "https:" ||
    checkoutOrigin.username ||
    checkoutOrigin.password ||
    checkoutOrigin.pathname !== "/" ||
    checkoutOrigin.search ||
    checkoutOrigin.hash
  )
    throw new Error("Use a public HTTPS native checkout origin");
  const context = {
    ...config,
    origin: origin.origin,
    checkoutOrigin: checkoutOrigin.origin,
  };
  async function request<T>(
    path: string,
    body: unknown,
    token?: string,
    method = "POST",
  ): Promise<T> {
    const response = await transport(context.origin + path, {
      method,
      credentials: "omit",
      cache: "no-store",
      redirect: "error",
      headers: {
        "Content-Type": "application/json",
        "x-tenant": context.shop,
        "sw-sales-channel-id": context.channel,
        "x-commerce-locale": context.locale,
        ...(token ? { "sw-context-token": token } : {}),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    const value = await response.json();
    if (!response.ok)
      throw new Error(`Veyndo Store API rejected request (${response.status})`);
    return value as T;
  }
  return {
    catalogue: <T = unknown>(search = "", after?: string) =>
      request<T>("/store-api/product", { search, after, limit: 50 }),
    createCart: <T = CartHandle>() =>
      request<T>("/store-api/checkout/cart", { session: crypto.randomUUID() }),
    readCart: <T = CartHandle>(token: string) =>
      request<T>("/store-api/checkout/cart", undefined, token, "GET"),
    replaceItems: <T = CartHandle>(
      cart: CartHandle,
      items: { id: string; quantity: number }[],
    ) =>
      request<T>(
        "/store-api/checkout/cart",
        { revision: cart.revision, items },
        cart.token,
        "PUT",
      ),
    checkout: async (cart: CartHandle) => {
      const value = await request<{ checkoutPath: string }>(
        "/store-api/checkout/handoff",
        { revision: cart.revision },
        cart.token,
      );
      const url = new URL(value.checkoutPath, context.checkoutOrigin);
      if (
        url.origin !== context.checkoutOrigin ||
        url.pathname !== "/checkout" ||
        url.searchParams.get("shop") !== context.shop ||
        url.searchParams.get("channel") !== context.channel ||
        !url.hash.startsWith("#checkout/")
      )
        throw new Error("Invalid native checkout handoff");
      return url.href;
    },
  };
}

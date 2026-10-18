/** Public agent actions must reuse native mutations, serialize revisions and never disclose cart capabilities or place orders. */
import { expect, it, vi } from "vitest";
import {
  createStorefrontActions,
  registerStorefrontTools,
} from "../../src/storefront/shell/storefront-actions";
it("serializes native cart updates and keeps the token and buyer out of results", async () => {
  let current: any = {
    id: "cart",
    token: "private-token",
    revision: 3,
    status: "open",
    buyer: { email: "private@example.test" },
    lineItems: [],
    price: { currency: "EUR", totalPrice: 0 },
  };
  const request = vi.fn(async (_: string, body: any, token?: string) => {
    expect(token).toBe("private-token");
    expect(body.revision).toBe(current.revision);
    return {
      ...current,
      revision: current.revision + 1,
      lineItems: body.items.map((i: any) => ({ ...i, label: "Product" })),
      price: { currency: "EUR", totalPrice: 12 },
    };
  });
  const actions = createStorefrontActions({
    request,
    getCart: () => current,
    saveCart: (c: any) => {
      current = c;
    },
    reviewCheckout: vi.fn(),
  });
  const results = await Promise.all([
    actions.updateCart({ items: [{ id: "lamp", quantity: 1 }] }),
    actions.updateCart({ items: [{ id: "lamp", quantity: 2 }] }),
  ]);
  expect(request).toHaveBeenCalledTimes(2);
  expect(current.revision).toBe(5);
  expect(JSON.stringify(results)).not.toContain("private-token");
  expect(JSON.stringify(results)).not.toContain("private@example.test");
  await expect(
    actions.updateCart({ items: [{ id: "lamp", quantity: -1 }] }),
  ).rejects.toThrow();
  expect(request).toHaveBeenCalledTimes(2);
});
it("registers scoped browser tools, unregisters on teardown and exposes checkout review only", async () => {
  const names = new Set<string>();
  const context = {
    registerTool: vi.fn((tool: any) => names.add(tool.name)),
    unregisterTool: vi.fn((name: string) => names.delete(name)),
  };
  const review = vi.fn();
  const actions = createStorefrontActions({
    request: vi.fn(),
    getCart: () => undefined,
    saveCart: vi.fn(),
    reviewCheckout: review,
  });
  const dispose = registerStorefrontTools(context, actions);
  expect([...names]).toEqual([
    "veyndo_search_catalog",
    "veyndo_get_cart",
    "veyndo_update_cart",
    "veyndo_review_checkout",
  ]);
  expect(
    [...names].some(
      (name) => name.includes("complete") || name.includes("payment"),
    ),
  ).toBe(false);
  await actions.reviewCheckout();
  expect(review).toHaveBeenCalledOnce();
  dispose();
  expect(names.size).toBe(0);
});
it("rejects negative additions and queued work from an abandoned shop", async () => {
  let active = true;
  let finish!: (cart: any) => void;
  const cart: any = {
    status: "open",
    revision: 1,
    token: "secret",
    lineItems: [{ id: "lamp", quantity: 4 }],
    price: { currency: "EUR", totalPrice: 4 },
  };
  const request = vi.fn(
    () =>
      new Promise<any>((resolve) => {
        finish = resolve;
      }),
  );
  const save = vi.fn();
  const actions = createStorefrontActions({
    request: request as any,
    getCart: () => cart,
    saveCart: save,
    reviewCheckout: vi.fn(),
    active: () => active,
  });
  await expect(actions.addProduct("lamp", -1)).rejects.toThrow();
  expect(request).not.toHaveBeenCalled();
  const first = actions.updateCart({ items: [{ id: "lamp", quantity: 1 }] });
  const second = actions.updateCart({ items: [] });
  await Promise.resolve();
  active = false;
  finish(cart);
  await expect(first).rejects.toThrow();
  await expect(second).rejects.toThrow();
  expect(request).toHaveBeenCalledTimes(1);
  expect(save).not.toHaveBeenCalled();
});
it("uses abortable registration and contains unavailable experimental APIs", async () => {
  let signal!: AbortSignal;
  const context = {
    registerTool: vi.fn((_tool: any, options: any) => {
      signal = options.signal;
      return Promise.reject(new Error("unsupported"));
    }),
  };
  const actions = createStorefrontActions({
    request: vi.fn(),
    getCart: () => undefined,
    saveCart: vi.fn(),
    reviewCheckout: vi.fn(),
  });
  const dispose = registerStorefrontTools(context, actions);
  await Promise.resolve();
  expect(signal.aborted).toBe(true);
  dispose();
});

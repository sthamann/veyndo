/** Browser capability discovery is optional; native shopping and shop scope remain authoritative. */
import { renderHook } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { useStorefrontActions } from "../../src/storefront/shell/useStorefrontActions";
const native = vi.hoisted(() => ({ request: vi.fn(), preview: false }));
vi.mock("../../src/shared/api/shop-api", () => ({ shopApi: native.request }));
vi.mock("../../src/storefront/shell/ChannelPreview", () => ({
  channelPreview: () => native.preview,
}));
const original = Object.getOwnPropertyDescriptor(document, "modelContext");
function context(value?: unknown) {
  Object.defineProperty(document, "modelContext", {
    configurable: true,
    value,
  });
}
afterEach(() => {
  if (original) Object.defineProperty(document, "modelContext", original);
  else delete (document as any).modelContext;
  native.preview = false;
  vi.resetAllMocks();
});
it("retains ordinary native shopping when the browser has no WebMCP support", async () => {
  context(undefined);
  const cart: any = {
    status: "open",
    revision: 1,
    token: "secret",
    lineItems: [],
    price: {},
  };
  native.request.mockResolvedValue({
    ...cart,
    revision: 2,
    lineItems: [{ id: "lamp", quantity: 1 }],
  });
  const save = vi.fn(),
    review = vi.fn();
  const hook = renderHook(() =>
    useStorefrontActions(cart, save, review, "shop-a", "session", "en-GB"),
  );
  await hook.result.current.addProduct("lamp", 1);
  expect(native.request).toHaveBeenCalledWith(
    "/store-api/checkout/cart",
    { revision: 1, items: [{ id: "lamp", quantity: 1 }] },
    "secret",
    "PUT",
  );
  expect(save).toHaveBeenCalledOnce();
  await hook.result.current.reviewCheckout();
  expect(review).toHaveBeenCalledOnce();
  hook.unmount();
});
it("replaces registrations on shop changes and rejects retained old tool handles", async () => {
  const calls: { tool: any; signal: AbortSignal }[] = [];
  const unregisterTool = vi.fn();
  context({
    registerTool: (tool: any, options: any) => {
      calls.push({ tool, signal: options.signal });
    },
    unregisterTool,
  });
  const save = vi.fn(),
    review = vi.fn();
  const hook = renderHook(
    ({ key }) =>
      useStorefrontActions(undefined, save, review, key, "session", "en-GB"),
    { initialProps: { key: "shop-a" } },
  );
  const oldAdd = calls.find(({ tool }) => tool.name === "veyndo_add_product")!;
  expect(calls).toHaveLength(5);
  hook.rerender({ key: "shop-b" });
  expect(oldAdd.signal.aborted).toBe(true);
  expect(calls).toHaveLength(10);
  await expect(
    oldAdd.tool.execute({ id: "lamp", quantity: 1 }),
  ).rejects.toThrow();
  expect(native.request).not.toHaveBeenCalled();
  expect(save).not.toHaveBeenCalled();
  hook.unmount();
  expect(calls.every(({ signal }) => signal.aborted)).toBe(true);
  expect(unregisterTool).toHaveBeenCalledTimes(10);
});
it("does not expose tools in a private channel preview", () => {
  const registerTool = vi.fn();
  context({ registerTool });
  native.preview = true;
  const hook = renderHook(() =>
    useStorefrontActions(
      undefined,
      vi.fn(),
      vi.fn(),
      "private",
      "session",
      "de-DE",
    ),
  );
  expect(registerTool).not.toHaveBeenCalled();
  hook.unmount();
});

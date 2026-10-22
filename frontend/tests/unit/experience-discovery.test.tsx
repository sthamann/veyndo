/** Storefront suggestion chips only prepare a question; explicit submission uses the same tenant-scoped cart transport. */
import { useState } from "react";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import { LocaleProvider } from "../../src/shared/i18n/i18n";
import { useShopText } from "../../src/shared/i18n/shop-i18n";
import { StorefrontContext } from "../../src/storefront/shell/StorefrontContext";
import type { StorefrontController } from "../../src/storefront/shell/useStorefrontController";
import { useStorefrontController } from "../../src/storefront/shell/useStorefrontController";
import ConciergeView from "../../src/storefront/shell/ConciergeView";
import { useShopperAdvice } from "../../src/storefront/shell/useShopperAdvice";
import { cart, product } from "./fixtures";
function Discovery({
  tenant = "unit-shop",
  visible = true,
  onError = () => {},
}: {
  tenant?: string;
  visible?: boolean;
  onError?: (e: unknown) => void;
}) {
  const { s, money, locale } = useShopText();
  const [wish, setWish] = useState("");
  const [advice, setAdvice, adviceContext, shortlist] = useShopperAdvice(
    tenant,
    "default",
    locale,
    cart,
  );
  const context = {
    s,
    money,
    locale,
    shopTenant: tenant,
    salesChannel: "default",
    wish,
    setWish,
    advice,
    setAdvice,
    adviceContext,
    shortlist,
    cart,
    products: [product],
    busy: false,
    run: async (action: () => Promise<void>) => {
      try {
        await action();
      } catch (error) {
        onError(error);
      }
    },
    setQuery: vi.fn(),
    setCategory: vi.fn(),
  } as unknown as StorefrontController;
  return (
    <StorefrontContext.Provider value={context}>
      {visible && <ConciergeView />}
    </StorefrontContext.Provider>
  );
}
it.each(["en-GB", "de-DE", "fr-FR", "es-ES"])(
  "prepares a localized question without running a model in %s",
  async (locale) => {
    localStorage.setItem("rac-locale", locale);
    render(<Discovery />, { wrapper: LocaleProvider });
    const user = userEvent.setup();
    const chip = screen.getAllByRole("button")[2];
    await user.click(chip);
    const question = screen.getByRole("textbox");
    expect(question).toHaveValue(chip.textContent);
    expect(question).toHaveFocus();
    expect(fetch).not.toHaveBeenCalled();
  },
);
it("submits an explicit request with tenant and checkout context, then shows server recommendations", async () => {
  const fetcher = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      answer: {
        explanation: "Stored catalogue recommendation",
        recommended_ids: [product.id],
      },
    }),
  });
  vi.stubGlobal("fetch", fetcher);
  render(<Discovery />, { wrapper: LocaleProvider });
  const user = userEvent.setup();
  await user.type(screen.getByRole("textbox"), "A reading light under 100 EUR");
  await user.click(screen.getByRole("button", { name: "Ask Veyndo ↗" }));
  await waitFor(() =>
    expect(screen.getByRole("status")).toHaveTextContent(
      "Stored catalogue recommendation",
    ),
  );
  expect(fetcher).toHaveBeenCalledTimes(1);
  expect(fetcher.mock.calls[0][0]).toBe("/api/concierge");
  expect(
    Object.fromEntries(new Headers(fetcher.mock.calls[0][1].headers)),
  ).toMatchObject({
    "x-tenant": "unit-shop",
    "sw-context-token": cart.token,
  });
  expect(JSON.parse(fetcher.mock.calls[0][1].body)).toEqual({
    request: "A reading light under 100 EUR",
  });
  expect(
    screen.getByRole("link", { name: "View product: Unit lamp" }),
  ).toHaveAttribute("href", expect.stringContaining(`/products/${product.id}`));
});
function RoutedShop() {
  const c = useStorefrontController({ onMerchant: vi.fn() });
  return (
    <>
      <a href="/?shop=unit-shop#assistant">Open advisor</a>
      <section id="assistant" data-route={c.appPath}>
        Advisor
      </section>
    </>
  );
}
it.each([false, true])(
  "restores anchor navigation in the actual storefront controller (reduced motion=%s)",
  async (reduced) => {
    history.replaceState(null, "", "/?shop=unit-shop#");
    vi.mocked(window.matchMedia).mockReturnValue({
      matches: reduced,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as unknown as MediaQueryList);
    render(<RoutedShop />, { wrapper: LocaleProvider });
    await userEvent.click(screen.getByRole("link", { name: "Open advisor" }));
    await waitFor(() =>
      expect(HTMLElement.prototype.scrollIntoView).toHaveBeenCalledWith({
        behavior: reduced ? "instant" : "smooth",
        block: "start",
      }),
    );
    expect(location.hash).toBe("#assistant");
  },
);

function PreviewProbe() {
  const c = useStorefrontController({ onMerchant: vi.fn() });
  return <output>{c.cart?.token ?? c.error}</output>;
}
it("loads the preview cart without assigning production experiments", async () => {
  history.replaceState(null, "", "/?shop=unit-shop&channel=private&preview=1");
  const fetcher = vi.fn(async (path: string) => ({
    ok: true,
    status: 200,
    json: async () =>
      path === "/store-api/checkout/cart"
        ? cart
        : path === "/store-api/company"
          ? { data: {} }
          : { elements: [product] },
  }));
  vi.stubGlobal("fetch", fetcher);
  render(<PreviewProbe />, { wrapper: LocaleProvider });
  await waitFor(() =>
    expect(screen.getByRole("status")).toHaveTextContent(cart.token),
  );
  expect(fetcher.mock.calls.some(([path]) => path === "/api/experience")).toBe(
    false,
  );
  history.replaceState(null, "", "/?shop=unit-shop");
});

it("discards a late recommendation after the shop context changes", async () => {
  let resolve!: (v: unknown) => void;
  const fetcher = vi.fn(
    () =>
      new Promise((r) => {
        resolve = r;
      }),
  );
  vi.stubGlobal("fetch", fetcher);
  const view = render(<Discovery />, { wrapper: LocaleProvider });
  await userEvent.type(screen.getByRole("textbox"), "Private customer context");
  await userEvent.click(screen.getByRole("button", { name: "Ask Veyndo ↗" }));
  await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1));
  view.rerender(<Discovery tenant="different-shop" />);
  await act(async () =>
    resolve({
      ok: true,
      json: async () => ({
        answer: {
          explanation: "Previous private response",
          recommended_ids: [product.id],
        },
      }),
    }),
  );
  expect(
    screen.queryByText("Previous private response"),
  ).not.toBeInTheDocument();
  expect(screen.queryByRole("article")).not.toBeInTheDocument();
});

it("keeps the edited product shortlist when returning from a native product page", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        answer: {
          explanation: "Saved choice",
          recommended_ids: [product.id],
        },
      }),
    }),
  );
  const view = render(<Discovery />, { wrapper: LocaleProvider });
  await userEvent.type(screen.getByRole("textbox"), "A lamp");
  await userEvent.click(screen.getByRole("button", { name: "Ask Veyndo ↗" }));
  await userEvent.click(
    await screen.findByRole("button", {
      name: `Remove from selection: ${product.name}`,
    }),
  );
  view.rerender(<Discovery visible={false} />);
  view.rerender(<Discovery />);
  expect(screen.getByText("Saved choice")).toBeVisible();
  expect(screen.queryByRole("article")).not.toBeInTheDocument();
  await userEvent.click(
    screen.getByRole("button", { name: "Restore selection" }),
  );
  expect(screen.getByRole("article")).toBeVisible();
});
it("discards a late provider error after leaving its shop context", async () => {
  let reject!: (e: Error) => void;
  const onError = vi.fn();
  const fetcher = vi.fn(
    () =>
      new Promise((_r, r) => {
        reject = r;
      }),
  );
  vi.stubGlobal("fetch", fetcher);
  const view = render(<Discovery onError={onError} />, {
    wrapper: LocaleProvider,
  });
  await userEvent.type(screen.getByRole("textbox"), "A lamp");
  await userEvent.click(screen.getByRole("button", { name: "Ask Veyndo ↗" }));
  view.rerender(<Discovery tenant="different-shop" onError={onError} />);
  await act(async () => reject(new Error("Previous private error")));
  expect(onError).not.toHaveBeenCalled();
});

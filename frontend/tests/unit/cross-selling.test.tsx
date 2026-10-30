/** Actual recommendation tiles use native detail authority, current cart identity, merchant order and private/channel rejection. */
import { render, screen, within, act } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import CrossSelling from "../../src/storefront/catalog/CrossSelling";
import { LocaleProvider } from "../../src/shared/i18n/i18n";
import { cart, detail, product } from "./fixtures";
import type { Detail } from "../../src/shared/api/shop-api";
const entry = (id: string): Detail => ({
  ...detail,
  product: {
    ...product,
    id,
    name: `Product ${id}`,
    media: [{ id: "real", url: `/${id}.webp`, view: "front" }],
    extra: { seo: { en: { title: "", description: "", slug: `slug-${id}` } } },
  },
  calculatedPrices: [
    {
      quantity: 1,
      price: { ...detail.calculatedPrices[0].price, unitPrice: 17.25 },
      discountPercent: 0,
    },
  ],
});
it("retains chosen order, native prices/media/links and hides forbidden/missing/self/duplicate products", async () => {
  const fetcher = vi.fn(async (path: string, _options: any) =>
    path.endsWith("/hidden")
      ? {
          ok: false,
          status: 404,
          statusText: "Not found",
          json: async () => ({ errors: [{ detail: "Product not found" }] }),
        }
      : {
          ok: true,
          status: 200,
          json: async () => entry(path.split("/").at(-1)!),
        },
  );
  vi.stubGlobal("fetch", fetcher);
  render(
    <CrossSelling
      ids={["b", "hidden", "a", "b", "self"]}
      sourceId="self"
      cart={cart}
    />,
    { wrapper: LocaleProvider },
  );
  await screen.findByRole("heading", { name: "Product b" });
  const region = screen.getByRole("region");
  expect(
    within(region)
      .getAllByRole("heading", { level: 3 })
      .map((e) => e.textContent),
  ).toEqual(["Product b", "Product a"]);
  expect(screen.getAllByText("€17.25")).toHaveLength(2);
  expect(screen.getByRole("img", { name: "Product a" })).toHaveAttribute(
    "src",
    "/a.webp",
  );
  expect(screen.getByRole("link", { name: "Product a" })).toHaveAttribute(
    "href",
    expect.stringContaining("/products/a/slug-a"),
  );
  expect(fetcher.mock.calls).toHaveLength(3);
  expect(fetcher.mock.calls[0][1].headers["sw-context-token"]).toBe(cart.token);
  expect(screen.queryByText("hidden")).not.toBeInTheDocument();
});
it("immediately hides old buyer results and ignores late replies after buyer/context changes", async () => {
  let release: (v: unknown) => void = () => {};
  vi.stubGlobal(
    "fetch",
    vi.fn(async (_path: string, options: any) =>
      options.headers["sw-context-token"] === cart.token
        ? { ok: true, status: 200, json: async () => entry("a") }
        : new Promise((resolve) => {
            release = resolve;
          }),
    ),
  );
  const { rerender } = render(
    <CrossSelling ids={["a"]} sourceId="self" cart={cart} />,
    { wrapper: LocaleProvider },
  );
  await screen.findByText("Product a");
  rerender(
    <LocaleProvider>
      <CrossSelling
        ids={["a"]}
        sourceId="self"
        cart={{ ...cart, token: "new-buyer" }}
      />
    </LocaleProvider>,
  );
  expect(screen.queryByText("Product a")).not.toBeInTheDocument();
  rerender(
    <LocaleProvider>
      <CrossSelling
        ids={[]}
        sourceId="self"
        cart={{ ...cart, token: "third-buyer" }}
      />
    </LocaleProvider>,
  );
  await act(async () => {
    release({ ok: true, status: 200, json: async () => entry("a") });
  });
  expect(screen.queryByText("Product a")).not.toBeInTheDocument();
});
it("limits native reads to 20 IDs and four concurrent requests", async () => {
  let active = 0,
    peak = 0;
  const fetcher = vi.fn(async (path: string) => {
    active++;
    peak = Math.max(peak, active);
    await Promise.resolve();
    active--;
    return {
      ok: true,
      status: 200,
      json: async () => entry(path.split("/").at(-1)!),
    };
  });
  vi.stubGlobal("fetch", fetcher);
  render(
    <CrossSelling
      ids={Array.from({ length: 24 }, (_, i) => `p${i}`)}
      sourceId="self"
      cart={cart}
    />,
    { wrapper: LocaleProvider },
  );
  await screen.findByRole("heading", { name: "Product p19" });
  expect(fetcher).toHaveBeenCalledTimes(20);
  expect(peak).toBeLessThanOrEqual(4);
});

/** Product preview uses current scoped native reads and discards stale responses without writing. */
import {
  render,
  screen,
  fireEvent,
  waitFor,
  expect,
  it,
  vi,
} from "../../../../frontend/tests/unit/package-test-support";
import { LocaleScope } from "../../../../frontend/src/shared/i18n/i18n";
import ProductComparison, {
  type ComparisonProps,
} from "../studio/ProductComparison";
import type { RequestFn } from "../../../../frontend/src/shared/api/types";
const record = {
  version: 1,
  source: "woocommerce",
  sourceShop: "source-shop",
  kind: "products" as const,
  sourceId: "mug-1",
  warnings: [],
  data: {
    name: { "en-GB": "Ceramic mug" },
    description: { "en-GB": "Original description" },
    sku: "MUG-1",
    price: { minor: 1990, currency: "EUR", scale: 2 },
  },
};
const snapshot = {
  translations: {
    en: { name: "Ceramic mug", description: "Original description" },
  },
  sku: "MUG-1",
  price: { amount: "19.90", currency: "EUR" },
  taxRate: 19,
  active: true,
  parentId: null,
  options: { Colour: "Blue" },
  media: [],
};
const result = {
  status: "changed",
  checkedAt: "2026-10-20T09:00:00Z",
  differences: ["/commerce/price"],
  preview: {
    expected: snapshot,
    actual: { ...snapshot, price: { amount: "22.50", currency: "EUR" } },
  },
};
const props: ComparisonProps = {
  mainLocale: "en-GB",
  review: {
    sourceId: "installed",
    kind: "products",
    adapterVersion: 1,
    records: [record],
    sourceVersion: "v1",
    recordDigests: ["a".repeat(64)],
  },
  target: "private-one",
  tax: "19",
  priceBasis: "gross",
  rights: ["apps.manage", "catalog.read", "environments.read"],
};
const view = (props: ComparisonProps) => (
  <LocaleScope locale="en-GB">
    <ProductComparison {...props} />
  </LocaleScope>
);
it("reads selected private target and shows source, mapped and actual values without importing", async () => {
  const request = vi.fn(async () => result),
    scoped = vi.fn(() => request);
  render(view({ ...props, scopedRequest: scoped }));
  expect(request).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Read current target" }));
  await screen.findByText(/Target has changed/);
  expect(scoped).toHaveBeenCalledWith("private-one");
  expect(request).toHaveBeenCalledExactlyOnceWith(
    "/api/merchant/imports/inspect",
    {
      record,
      options: { channelId: "default", taxRate: 19, sourcePriceBasis: "gross" },
      details: true,
    },
  );
  expect(screen.getByText("22.50 EUR")).toBeVisible();
  expect(screen.getAllByText("19.90 EUR")).toHaveLength(2);
  expect(screen.getByText(/not a publication check/)).toBeVisible();
});
it("clears old target data immediately and ignores a late former workspace result", async () => {
  let finish!: (v: unknown) => void;
  const request: RequestFn = vi.fn(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  const scoped = vi.fn(() => request);
  const page = render(view({ ...props, scopedRequest: scoped }));
  fireEvent.click(screen.getByRole("button", { name: "Read current target" }));
  page.rerender(
    view({ ...props, target: "private-two", scopedRequest: scoped }),
  );
  finish(result);
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: "Read current target" }),
    ).toBeEnabled(),
  );
  expect(screen.queryByText("22.50 EUR")).toBeNull();
});
it("requires current read rights and explicit native tax choices", () => {
  const request = vi.fn();
  render(
    view({ ...props, rights: ["apps.manage"], scopedRequest: () => request }),
  );
  expect(
    screen.getByRole("button", { name: "Read current target" }),
  ).toBeDisabled();
  expect(request).not.toHaveBeenCalled();
});
it("shows a missing native product honestly and allows retry after an error", async () => {
  const request = vi
    .fn()
    .mockRejectedValueOnce(new Error("Target unavailable"))
    .mockResolvedValue({
      ...result,
      status: "missing",
      differences: [],
      preview: { expected: snapshot, actual: null },
    });
  render(view({ ...props, scopedRequest: () => request }));
  fireEvent.click(screen.getByRole("button", { name: "Read current target" }));
  await screen.findByRole("alert");
  fireEvent.click(screen.getByRole("button", { name: "Read current target" }));
  await screen.findAllByText("Not yet in this target");
  expect(screen.queryByText("22.50 EUR")).toBeNull();
});

it("uses a non-English shop main language when the current language has no product text", async () => {
  const native = {
    ...snapshot,
    translations: {
      fr: { name: "Tasse française", description: "Texte original français" },
    },
  };
  render(
    view({
      ...props,
      mainLocale: "fr-FR",
      scopedRequest: () =>
        vi.fn(async () => ({
          ...result,
          preview: { expected: native, actual: native },
        })),
    }),
  );
  fireEvent.click(screen.getByRole("button", { name: "Read current target" }));
  await screen.findAllByText("Tasse française");
  expect(screen.getAllByText("Texte original français")).toHaveLength(2);
});

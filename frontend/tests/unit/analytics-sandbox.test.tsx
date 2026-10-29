/** Private browser journeys must not initialize the live analytics app or its provider. */
import { render, waitFor } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import ShopAnalytics from "../../../extensions/apps/google-analytics/storefront/ShopAnalytics";
import { shopApi } from "../../src/shared/api/shop-api";
vi.mock("../../src/shared/api/shop-api", () => ({ shopApi: vi.fn() }));

it.each(["sandbox", "preview"])(
  "does not discover GA4 in a %s browser journey",
  async (flag) => {
    history.replaceState(null, "", `/?shop=unit-shop&${flag}=1`);
    vi.mocked(shopApi).mockClear();
    vi.mocked(shopApi).mockResolvedValue({ measurementId: "G-SYNTHETIC" });
    render(
      <ShopAnalytics
        shop="unit-shop"
        channel="default"
        products={[]}
        bag={false}
      />,
    );
    await waitFor(() => expect(shopApi).not.toHaveBeenCalled());
    expect(
      document.querySelector('script[src*="googletagmanager"]'),
    ).toBeNull();
  },
);

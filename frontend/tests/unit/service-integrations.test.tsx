/** Visible provider setup, scope fences, native app routing and stateless headless transport. */
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { it, expect, vi } from "vitest";
import Connection from "../../../extensions/apps/migration/studio/Connection";
import { LocaleProvider } from "../../src/shared/i18n/i18n";
import ServiceIntegrationPanel from "../../src/admin/apps/ServiceIntegrationPanel";
import IntegrationDirectory, {
  integrationRoutes,
} from "../../src/admin/apps/IntegrationDirectory";
import { createVeyndoStorefront } from "../../../extensions/apps/vercel/frontend/client";
const wrapper = LocaleProvider;
it("does not read integration status without app-management rights", () => {
  const request = vi.fn();
  render(
    <ServiceIntegrationPanel app="vercel" request={request} manage={false} />,
    { wrapper },
  );
  expect(request).not.toHaveBeenCalled();
  expect(
    screen.getByText(/requires app-management rights/),
  ).toBeInTheDocument();
});
it("requires saving changed connection fields before a provider action", async () => {
  const status = {
    revision: 2,
    settings: { enabled: true },
    credentialConfigured: true,
    jobs: [],
  };
  const request = vi.fn().mockResolvedValue(status);
  render(<ServiceIntegrationPanel app="vercel" request={request} manage />, {
    wrapper,
  });
  const button = await screen.findByRole("button", {
    name: "Run explicit operation",
  });
  await waitFor(() => expect(button).toBeEnabled());
  fireEvent.change(screen.getByLabelText("Private API key / Deploy Hook"), {
    target: { value: "private-fixture" },
  });
  expect(button).toBeDisabled();
  expect(screen.getByText(/Save connection changes/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Save connection" }));
  await waitFor(() =>
    expect(request).toHaveBeenCalledWith("/api/apps/vercel/actions/configure", {
      revision: 2,
      settings: { enabled: true },
      credentials: { apiKey: "private-fixture" },
    }),
  );
  await waitFor(() =>
    expect(screen.getByLabelText("Private API key / Deploy Hook")).toHaveValue(
      "",
    ),
  );
});
it("discards a late response from a previously selected provider", async () => {
  let finish!: (v: unknown) => void;
  const old = vi.fn(
    () =>
      new Promise<any>((resolve) => {
        finish = resolve;
      }),
  );
  const next = vi.fn().mockResolvedValue({
    revision: 0,
    settings: { enabled: false },
    credentialConfigured: false,
    jobs: [],
  });
  const { rerender } = render(
    <ServiceIntegrationPanel app="vercel" request={old} manage />,
    { wrapper },
  );
  rerender(<ServiceIntegrationPanel app="hubspot" request={next} manage />);
  await screen.findByText("HubSpot");
  finish({
    revision: 99,
    settings: { enabled: true },
    credentialConfigured: true,
    jobs: [{ id: "foreign-job", state: "completed" }],
  });
  await waitFor(() =>
    expect(screen.queryByText("foreign-job")).not.toBeInTheDocument(),
  );
});
it("routes ten integrations through native app consent or the explicit Nexus HTTP guide", () => {
  const onOpen = vi.fn(),
    onInstall = vi.fn();
  render(
    <IntegrationDirectory
      packages={[]}
      manage
      busy={false}
      onOpen={onOpen}
      onInstall={onInstall}
    />,
    { wrapper },
  );
  expect(integrationRoutes).toHaveLength(10);
  fireEvent.click(
    screen.getAllByRole("button", { name: "Set up app", hidden: true })[0],
  );
  expect(onInstall).toHaveBeenCalledWith("vercel");
  expect(
    screen.getByRole("link", { name: "Open setup guide", hidden: true }),
  ).toHaveAttribute("href", expect.stringContaining("#shopware-nexus"));
});
it("headless frontend uses native cart revisions and a single-use checkout, with no merchant bearer", async () => {
  const wire = vi
    .fn()
    .mockResolvedValueOnce(
      new Response(JSON.stringify({ token: "cart-a", revision: 3 })),
    )
    .mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          checkoutPath: "/checkout?shop=shop-a&channel=default#checkout/ticket",
        }),
      ),
    );
  const client = createVeyndoStorefront(
    {
      origin: "https://app.veyndo.ai",
      shop: "shop-a",
      channel: "default",
      locale: "de-DE",
    },
    wire,
  );
  await client.replaceItems({ token: "cart-a", revision: 2 }, [
    { id: "mug", quantity: 1 },
  ]);
  expect(JSON.parse(wire.mock.calls[0][1].body)).toEqual({
    revision: 2,
    items: [{ id: "mug", quantity: 1 }],
  });
  expect(wire.mock.calls[0][1].headers).toMatchObject({
    "x-tenant": "shop-a",
    "sw-context-token": "cart-a",
  });
  expect(wire.mock.calls[0][1].headers.Authorization).toBeUndefined();
  expect(await client.checkout({ token: "cart-a", revision: 3 })).toBe(
    "https://app.veyndo.ai/checkout?shop=shop-a&channel=default#checkout/ticket",
  );
  const hostile = createVeyndoStorefront(
    {
      origin: "https://app.veyndo.ai",
      shop: "shop-a",
      channel: "default",
      locale: "de-DE",
    },
    vi
      .fn()
      .mockResolvedValue(
        new Response(
          JSON.stringify({ checkoutPath: "https://attacker.test/checkout" }),
        ),
      ),
  );
  await expect(
    hostile.checkout({ token: "cart-a", revision: 3 }),
  ).rejects.toThrow("Invalid native checkout");
});

it("preselects the requested inward source only for an unconfigured connection", async () => {
  history.replaceState(
    null,
    "",
    "/?shop=unit-shop&migrationSource=shopware6#merchant",
  );
  const request = vi.fn().mockResolvedValue({
    revision: 0,
    values: { system: "shopify" },
    canManage: true,
    encryptionReady: true,
  });
  const { unmount } = render(<Connection request={request} />, { wrapper });
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "shopware6" })).toHaveAttribute(
      "aria-pressed",
      "true",
    ),
  );
  unmount();
  const saved = vi.fn().mockResolvedValue({
    revision: 2,
    values: { system: "woocommerce" },
    canManage: true,
    encryptionReady: true,
  });
  render(<Connection request={saved} />, { wrapper });
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "woocommerce" })).toHaveAttribute(
      "aria-pressed",
      "true",
    ),
  );
});

it("saves an initially disabled connection without requiring a spurious enable action", async () => {
  const request = vi.fn();
  request.mockResolvedValue({
    revision: 0,
    settings: {},
    credentialConfigured: false,
    jobs: [],
  });
  render(<ServiceIntegrationPanel app="hubspot" request={request} manage />, {
    wrapper,
  });
  const save = screen.getByRole("button", { name: "Save connection" });
  await waitFor(() => expect(save).toBeEnabled());
  fireEvent.change(screen.getByLabelText("Private API key / Deploy Hook"), {
    target: { value: "synthetic-private-key" },
  });
  fireEvent.click(save);
  await waitFor(() =>
    expect(request).toHaveBeenCalledWith(
      "/api/apps/hubspot/actions/configure",
      {
        revision: 0,
        settings: { enabled: false },
        credentials: { apiKey: "synthetic-private-key" },
      },
    ),
  );
});

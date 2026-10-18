/** Merchant controls distinguish native readiness, external approval and inward catalogue intake. */
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import AgenticChannels from "../../src/admin/channels/AgenticChannels";
import { LocaleProvider } from "../../src/shared/i18n/i18n";
it("keeps external approval unverified and opens inward imports rather than foreign checkout", async () => {
  const request = vi.fn().mockResolvedValue({
    agentic: {
      destination: "veyndo",
      channel: "default",
      cartTransfer: true,
      buyerConsent: true,
      externalAcceptance: "not_verified",
      configuredPayments: [{ id: "demo-card", mode: "simulated" }],
    },
  });
  const imported = vi.fn();
  render(
    <LocaleProvider>
      <AgenticChannels
        request={request}
        canRead
        canImport
        onImport={imported}
        onBack={() => {}}
        channels={[]}
        mainLocale="en-GB"
      />
    </LocaleProvider>,
  );
  await waitFor(() => expect(request).toHaveBeenCalled());
  expect(
    await screen.findByText("External approval not verified"),
  ).toBeVisible();
  fireEvent.click(
    screen.getByRole("button", { name: "Import Shopify export" }),
  );
  expect(imported).toHaveBeenCalledWith("shopify_csv");
  expect(screen.queryByText("Connected to Google")).not.toBeInTheDocument();
});
it("does not fetch protected readiness or offer imports without current rights", () => {
  const request = vi.fn();
  render(
    <LocaleProvider>
      <AgenticChannels
        request={request}
        canRead={false}
        canImport={false}
        onImport={() => {}}
        onBack={() => {}}
        channels={[]}
        mainLocale="en-GB"
      />
    </LocaleProvider>,
  );
  expect(request).not.toHaveBeenCalled();
  expect(
    screen.getByRole("button", { name: "Import Shopify export" }),
  ).toBeDisabled();
});

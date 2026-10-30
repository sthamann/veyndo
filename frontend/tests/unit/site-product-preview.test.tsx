/** Preview uses only private scoped native reads and never invokes the shopper controller. */
import { render, screen, fireEvent, act } from "@testing-library/react";
import { it, expect, vi } from "vitest";
import Preview from "../../../extensions/apps/site-builder/studio/NativeProductPreview";
import { LocaleScope } from "../../src/shared/i18n/i18n";
import { detail } from "./fixtures";

const base = {
  workspace: "private-a",
  channel: "channel-a",
  language: "fr-FR",
  mainLocale: "de-DE",
  id: detail.product.id,
};
const scoped = (value = detail) =>
  vi.fn(
    async (
      path: string,
      _body?: unknown,
      _method?: string,
      _options?: unknown,
    ) => (path.endsWith("/attachments") ? { elements: [] } : value),
  );
const view = (request: any, props = base) => (
  <LocaleScope locale="en-GB">
    <Preview {...props} request={request} />
  </LocaleScope>
);
it("renders the native gallery, price and variants without cart, telemetry, app actions or global transport", async () => {
  const fetch = vi
    .fn()
    .mockRejectedValue(new Error("Unexpected global transport"));
  vi.stubGlobal("fetch", fetch);
  const request = scoped();
  const originalURL = location.href;
  render(view(request));
  await screen.findByRole("heading", { name: detail.product.name });
  expect(request).toHaveBeenCalledWith(
    `/store-api/product/${encodeURIComponent(detail.product.id)}`,
    {},
    "POST",
    { salesChannel: "channel-a", locale: "fr-FR" },
  );
  expect(screen.getByRole("spinbutton")).toBeDisabled();
  const buttons = screen.getAllByRole("button");
  for (const button of buttons)
    if ((button as HTMLButtonElement).disabled) fireEvent.click(button);
  expect(fetch).not.toHaveBeenCalled();
  expect(request).toHaveBeenCalledTimes(2);
  expect(request).toHaveBeenCalledWith(
    `/store-api/product/${detail.product.id}/attachments`,
    undefined,
    "GET",
    { salesChannel: "channel-a", locale: "fr-FR" },
  );
  expect(location.href).toBe(originalURL);
  expect(screen.getAllByRole("img").length).toBeGreaterThan(0);
});
it("hides the previous scope immediately and discards a late foreign result", async () => {
  let finish!: (value: typeof detail) => void;
  const oldRequest = vi.fn(
    () =>
      new Promise<typeof detail>((resolve) => {
        finish = resolve;
      }),
  );
  const newRequest = scoped({
    ...detail,
    product: { ...detail.product, name: "Current private product" },
  });
  const { rerender } = render(view(oldRequest));
  rerender(
    view(newRequest, { ...base, workspace: "private-b", channel: "channel-b" }),
  );
  await screen.findByRole("heading", { name: "Current private product" });
  await act(async () => finish(detail));
  expect(
    screen.queryByRole("heading", { name: detail.product.name }),
  ).toBeNull();
  expect(newRequest.mock.calls[0][3]).toEqual({
    salesChannel: "channel-b",
    locale: "fr-FR",
  });
});
it("makes a rejected native read retryable without creating a cart", async () => {
  const request = vi
    .fn()
    .mockRejectedValueOnce(new Error("Access changed"))
    .mockResolvedValueOnce(detail)
    .mockResolvedValueOnce({ elements: [] });
  render(view(request));
  expect(await screen.findByRole("alert")).toHaveTextContent("Access changed");
  fireEvent.click(screen.getByRole("button", { name: "Try again" }));
  await screen.findByRole("heading", { name: detail.product.name });
  expect(request).toHaveBeenCalledTimes(3);
  expect(
    request.mock.calls.every(([path]) =>
      path.startsWith("/store-api/product/"),
    ),
  ).toBe(true);
});

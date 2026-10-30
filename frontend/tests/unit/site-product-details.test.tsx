/** Lower preview uses native presentation, explicit locale inheritance and scoped attachment reads without shopper effects. */
import {
  render,
  screen,
  fireEvent,
  act,
  waitFor,
} from "@testing-library/react";
import { expect, it, vi } from "vitest";
import Preview from "../../../extensions/apps/site-builder/studio/NativeProductDetails";
import { LocaleScope } from "../../src/shared/i18n/i18n";
import { detail } from "./fixtures";
import type { Detail } from "../../src/shared/api/shop-api";
const props = {
  workspace: "private-a",
  channel: "channel-a",
  language: "it-IT",
  mainLocale: "de-DE",
};
const data: Detail = {
  ...detail,
  product: {
    ...detail.product,
    extra: {
      richDescription: {
        "de-DE": [{ type: "paragraph", text: "Deutscher Haupttext" }],
        "it-CH": [{ type: "paragraph", text: "Swiss only" }],
      },
      specifications: {
        "de-DE": { Size: "24 cm", Finish: "Natural" },
        "it-IT": { Finish: "" },
      },
      compliance: {
        manufacturer: {
          "de-DE": "Werkstatt Berlin",
          "it-CH": "Swiss manufacturer",
        },
        warnings: { "de-DE": "Keep dry" },
      },
    },
  },
  reviews: {
    count: 1,
    average: 5,
    elements: [
      {
        id: "r1",
        author: "Demo Buyer",
        title: "Useful light",
        content: "Clear warm light",
        rating: 5,
        verifiedPurchase: true,
        demo: true,
      },
    ],
  },
};
const attachment = {
  id: "manual",
  filename: "manual.pdf",
  title: { "de-DE": "Anleitung", "it-CH": "Swiss manual" },
};
const view = (request: any, productData = data, context = props) => (
  <LocaleScope locale="en-GB">
    <Preview {...context} request={request} data={productData} />
  </LocaleScope>
);
it("shows shared details, safety, public files and reviews using the actual main language, including a fifth language", async () => {
  const request = vi.fn().mockResolvedValue({ elements: [attachment] });
  const fetch = vi.fn();
  vi.stubGlobal("fetch", fetch);
  render(view(request));
  const download = await screen.findByRole("button", {
    name: "Anleitung · manual.pdf",
  });
  expect(download).toBeDisabled();
  fireEvent.click(download);
  expect(screen.getByText("Deutscher Haupttext")).toBeVisible();
  expect(screen.getByText("24 cm")).toBeVisible();
  expect(screen.queryByText("Natural")).toBeNull();
  expect(screen.getByText("Werkstatt Berlin")).toBeVisible();
  expect(screen.queryByText("Swiss only")).toBeNull();
  expect(screen.queryByText("Swiss manufacturer")).toBeNull();
  expect(screen.getByText("Clear warm light")).toBeVisible();
  expect(screen.queryByRole("textbox")).toBeNull();
  expect(request).toHaveBeenCalledExactlyOnceWith(
    "/store-api/product/lamp/attachments",
    undefined,
    "GET",
    { salesChannel: "channel-a", locale: "it-IT" },
  );
  expect(fetch).not.toHaveBeenCalled();
});
it("preserves an explicit empty rich description instead of restoring inherited content", async () => {
  const request = vi.fn().mockResolvedValue({ elements: [] });
  render(
    view(request, {
      ...data,
      product: {
        ...data.product,
        extra: {
          ...data.product.extra,
          richDescription: {
            ...data.product.extra!.richDescription,
            "it-IT": [],
          },
        },
      },
    }),
  );
  await waitFor(() => expect(screen.queryByRole("status")).toBeNull());
  expect(screen.queryByText("Deutscher Haupttext")).toBeNull();
  expect(screen.queryByText(detail.product.description)).toBeNull();
});
it("uses an exact regional rich description before its base language", async () => {
  render(
    view(vi.fn().mockResolvedValue({ elements: [] }), {
      ...data,
      product: {
        ...data.product,
        extra: {
          richDescription: {
            it: [{ type: "paragraph", text: "Base Italian" }],
            "it-IT": [{ type: "paragraph", text: "Exact Italian" }],
          },
        },
      },
    }),
  );
  await waitFor(() => expect(screen.queryByRole("status")).toBeNull());
  expect(screen.getByText("Exact Italian")).toBeVisible();
  expect(screen.queryByText("Base Italian")).toBeNull();
});
it("keeps native rich links and consent controls from navigating or opening the shopper consent dialog", async () => {
  const consent = vi.fn();
  window.addEventListener("veyndo:privacy-open", consent);
  const request = vi.fn().mockResolvedValue({ elements: [] });
  const linked: Detail = {
    ...detail,
    product: {
      ...detail.product,
      extra: {
        richDescription: {
          "it-IT": [
            {
              type: "document",
              doc: {
                type: "doc",
                content: [
                  {
                    type: "paragraph",
                    content: [
                      {
                        type: "text",
                        text: "Product guide",
                        marks: [
                          {
                            type: "link",
                            attrs: { href: "https://example.test/guide" },
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
            },
            {
              type: "video",
              url: "https://example.test/movie.mp4",
              text: "Demo film",
            },
          ],
        },
      },
    },
  };
  const original = location.href;
  render(view(request, linked));
  await waitFor(() => expect(screen.queryByRole("status")).toBeNull());
  expect(
    fireEvent.click(screen.getByRole("link", { name: "Product guide" })),
  ).toBe(false);
  const media = screen
    .getAllByRole("button")
    .find((button) => !button.hasAttribute("disabled"));
  if (media) fireEvent.click(media);
  expect(consent).not.toHaveBeenCalled();
  expect(location.href).toBe(original);
  window.removeEventListener("veyndo:privacy-open", consent);
});
it("reports attachment failures and retries only that scoped read", async () => {
  const request = vi
    .fn()
    .mockRejectedValueOnce(new Error("Attachment read denied"))
    .mockResolvedValueOnce({ elements: [attachment] });
  render(view(request));
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Attachment read denied",
  );
  expect(screen.getByText("Deutscher Haupttext")).toBeVisible();
  fireEvent.click(
    screen.getByRole("button", { name: "Retry product downloads" }),
  );
  await screen.findByRole("button", { name: "Anleitung · manual.pdf" });
  expect(screen.queryByRole("alert")).toBeNull();
  expect(request).toHaveBeenCalledTimes(2);
});
it.each(["workspace", "channel", "language"] as const)(
  "discards late attachments after a %s change",
  async (key) => {
    let finish!: (value: unknown) => void;
    const request = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            finish = resolve;
          }),
      )
      .mockResolvedValueOnce({
        elements: [{ ...attachment, name: "Current file" }],
      });
    const { rerender } = render(view(request));
    rerender(view(request, data, { ...props, [key]: "new-scope" }));
    await screen.findByRole("button", { name: "Current file · manual.pdf" });
    await act(async () =>
      finish({ elements: [{ ...attachment, name: "Old file" }] }),
    );
    expect(screen.queryByText(/Old file/)).toBeNull();
  },
);

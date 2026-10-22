/** Preparation reloads durable progress and links repair to native product editors without repeating successful jobs. */
import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
} from "@testing-library/react";
import { expect, it, vi } from "vitest";
import CatalogPreparation from "../../src/admin/catalog/CatalogPreparation";
import { LocaleScope } from "../../src/shared/i18n/i18n";
const product = (id: string, state: string | null) => ({
  id,
  name: id,
  active: true,
  productNumber: id.toUpperCase(),
  media: [],
  preparation: {
    locales: ["de-DE", "nl-NL"],
    namedLocales: ["de-DE"],
    describedLocales: [],
    mainLocale: "de-DE",
    imageJob: state ? { id: `image-${id}`, state } : null,
  },
});
it("restores a failed image after reload and opens only the requested repair", async () => {
  const request = vi.fn().mockResolvedValue({
      elements: [
        product("failed-item", "failed"),
        product("done-item", "ready"),
      ],
      hasMore: false,
    }),
    open = vi.fn();
  const view = () => (
    <LocaleScope locale="en-GB">
      <CatalogPreparation request={request} onOpen={open} />
    </LocaleScope>
  );
  render(view());
  fireEvent.click(
    await screen.findByRole("button", { name: "Image failed · open to retry" }),
  );
  expect(open).toHaveBeenLastCalledWith("failed-item", "media");
  expect(
    screen.getByRole("button", { name: "Review image draft" }),
  ).toBeVisible();
  expect(screen.getAllByText(/nl-NL/).length).toBeGreaterThan(0);
  expect(request).toHaveBeenCalledWith(
    expect.stringContaining("preparation=true"),
  );
  cleanup();
  render(view());
  expect(
    await screen.findByRole("button", { name: "Image failed · open to retry" }),
  ).toBeVisible();
  expect(request.mock.calls.every((call) => call.length === 1)).toBe(true);
});
it("discards a late progress response after switching shop or environment", async () => {
  let old!: (v: unknown) => void;
  const previous = vi.fn(
    () =>
      new Promise((resolve) => {
        old = resolve;
      }),
  );
  const current = vi.fn().mockResolvedValue({
    elements: [product("new-scope", null)],
    hasMore: false,
  });
  const view = (request: any) => (
    <LocaleScope locale="en-GB">
      <CatalogPreparation request={request} onOpen={vi.fn()} />
    </LocaleScope>
  );
  const { rerender } = render(view(previous));
  await waitFor(() => expect(previous).toHaveBeenCalled());
  rerender(view(current));
  expect(await screen.findByText("new-scope")).toBeVisible();
  old({ elements: [product("foreign-old", "failed")], hasMore: false });
  await waitFor(() => expect(screen.queryByText("foreign-old")).toBeNull());
});

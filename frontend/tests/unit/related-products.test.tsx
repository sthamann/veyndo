/** Related-product searches preserve selection, current locale, ordering, unavailable records and native admission limits. */
import { useState } from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import RelatedProducts from "../../src/admin/catalog/RelatedProducts";
import { LocaleProvider } from "../../src/shared/i18n/i18n";
import { newDraft } from "../../src/admin/catalog/catalog-model";
const record = (id: string, name: string) => {
  const d = newDraft();
  d.id = id;
  d.catalog.productNumber = `SKU-${id}`;
  d.catalog.active = true;
  d.translations = { en: { name, description: null } };
  return d;
};
it("keeps selected names during zero-result searches and moves them without saving or dropping missing IDs", async () => {
  let chosen = ["a", "b", "gone"];
  const request = vi.fn(async (path: string) => {
    if (path.endsWith("/gone")) throw new Error("Not found");
    if (path.endsWith("/a")) return record("a", "Oak chair");
    if (path.endsWith("/b")) return record("b", "Desk lamp");
    return {
      elements: path.includes("search=none")
        ? []
        : [
            { id: "a", name: "Oak chair" },
            { id: "self", name: "Self" },
          ],
      nextCursor: null,
    };
  });
  function Editor() {
    const [v, set] = useState(chosen);
    return (
      <RelatedProducts
        id="self"
        request={request}
        value={v}
        language="it-IT"
        onChange={(next) => {
          chosen = next;
          set(next);
        }}
      />
    );
  }
  render(<Editor />, { wrapper: LocaleProvider });
  expect(
    await screen.findByText("Oak chair", { selector: "strong" }),
  ).toBeVisible();
  await screen.findByText("Product unavailable", { selector: "strong" });
  expect(request).toHaveBeenCalledWith(
    "/api/merchant/products/a",
    undefined,
    undefined,
    { locale: "it-IT" },
  );
  const user = userEvent.setup();
  await user.type(screen.getByRole("searchbox"), "none");
  await screen.findByText(/No matching products/);
  expect(
    within(
      screen.getByRole("region", { name: "Selected recommendations" }),
    ).getByText("Oak chair"),
  ).toBeVisible();
  await user.click(
    screen.getByRole("button", { name: "Move Desk lamp earlier" }),
  );
  expect(chosen).toEqual(["b", "a", "gone"]);
  await user.click(
    screen.getByRole("button", { name: "Remove Product unavailable" }),
  );
  expect(chosen).toEqual(["b", "a"]);
  expect(request.mock.calls.filter(([p]) => p.endsWith("/a"))).toHaveLength(1);
});
it("loads the next native cursor, prevents self/duplicate additions and keeps search available to read-only users", async () => {
  let chosen: string[] = [];
  const request = vi.fn(async (path: string) => ({
    elements: path.includes("after=cursor-1")
      ? [{ id: "b", name: "Second" }]
      : [
          { id: "self", name: "Self" },
          { id: "a", name: "First" },
        ],
    nextCursor: path.includes("after=") ? null : "cursor-1",
  }));
  function Editor() {
    const [v, set] = useState(chosen);
    return (
      <RelatedProducts
        id="self"
        request={request}
        value={v}
        onChange={(next) => {
          chosen = next;
          set(next);
        }}
      />
    );
  }
  const { rerender } = render(<Editor />, { wrapper: LocaleProvider });
  const user = userEvent.setup();
  await screen.findByRole("checkbox", { name: /First/ });
  expect(
    screen.queryByRole("checkbox", { name: /Self/ }),
  ).not.toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Load more products" }));
  await screen.findByRole("checkbox", { name: /Second/ });
  await user.click(screen.getByRole("checkbox", { name: /Second/ }));
  expect(chosen).toEqual(["b"]);
  rerender(
    <LocaleProvider>
      <RelatedProducts
        id="self"
        request={request}
        value={chosen}
        canWrite={false}
        onChange={() => {
          throw new Error("write");
        }}
      />
    </LocaleProvider>,
  );
  expect(screen.getByRole("searchbox")).toBeEnabled();
  await screen.findByRole("checkbox", { name: /First/ });
  screen.getAllByRole("checkbox").forEach((c) => expect(c).toBeDisabled());
});
it("explains failed searches and retries while preserving the current selection", async () => {
  let failed = true;
  const request = vi.fn(async (path: string) => {
    if (path.includes("?")) {
      if (failed) throw new Error("Search unavailable");
      return { elements: [{ id: "b", name: "Recovered" }] };
    }
    return record("a", "Selected");
  });
  render(
    <RelatedProducts
      id="self"
      request={request}
      value={["a"]}
      onChange={vi.fn()}
    />,
    { wrapper: LocaleProvider },
  );
  await screen.findByRole("alert");
  failed = false;
  await userEvent
    .setup()
    .click(screen.getByRole("button", { name: "Try again" }));
  expect(
    await screen.findByRole("checkbox", { name: /Recovered/ }),
  ).toBeVisible();
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
});
it("never admits a 21st selected product", async () => {
  const change = vi.fn(),
    request = vi.fn(async (path: string) =>
      path.includes("?")
        ? { elements: [{ id: "extra", name: "Extra" }] }
        : record(path.split("/").at(-1)!, "Selected"),
    );
  render(
    <RelatedProducts
      id="self"
      request={request}
      value={Array.from({ length: 20 }, (_, i) => `p${i}`)}
      onChange={change}
    />,
    { wrapper: LocaleProvider },
  );
  expect(await screen.findByRole("checkbox", { name: /Extra/ })).toBeDisabled();
  expect(change).not.toHaveBeenCalled();
});

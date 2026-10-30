/** Product assignment checks preserve hidden choices, native channel semantics and main-language fallback. */
import { useState } from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import { LocaleProvider } from "../../src/shared/i18n/i18n";
import ProductAssignments from "../../src/admin/catalog/ProductAssignments";
import ProductEditor from "../../src/admin/catalog/ProductEditor";
import {
  newDraft,
  type Category,
  type ProductDraft,
} from "../../src/admin/catalog/catalog-model";
import { categoryChoices } from "../../src/admin/catalog/product-assignment-model";
const category = (
  id: string,
  name: string,
  parentId: string | null = null,
): Category => ({
  id,
  parentId,
  position: 0,
  revision: 1,
  data: {
    active: true,
    visible: true,
    type: "page",
    translations: { de: { name } },
  },
});
const categories = [
  category("root", "Wohnen"),
  category("chairs", "Stühle", "root"),
  category("dining", "Esszimmer", "root"),
];
function fixture(): ProductDraft {
  const draft = { ...newDraft(), id: "p1", mainLocale: "de-DE" };
  draft.catalog.categoryIds = ["chairs", "not-in-this-list"];
  draft.channels = [
    {
      id: "web",
      visible: true,
      data: {
        name: { "de-DE": "Mein Shop" },
        kind: "storefront",
        active: true,
        productIds: [],
      },
    },
    {
      id: "market",
      visible: false,
      data: {
        name: { "de-DE": "Marktplatz" },
        kind: "marketplace",
        active: false,
        visibility: "private",
        productIds: ["other"],
      },
    },
  ];
  return draft;
}
it("finds categories by their full translated path and retains selections hidden by search", async () => {
  let saved = fixture();
  function Harness() {
    const [draft, setDraft] = useState(saved);
    return (
      <LocaleProvider>
        <ProductAssignments
          draft={draft}
          categories={categories}
          language="it-IT"
          canWrite
          onChange={(next) => {
            saved = next;
            setDraft(next);
          }}
        />
      </LocaleProvider>
    );
  }
  render(<Harness />);
  expect(
    screen.getByRole("checkbox", { name: "Wohnen / Stühle" }),
  ).toBeChecked();
  await userEvent.type(
    screen.getByRole("searchbox", { name: "Search categories or paths" }),
    "wohnen / ess",
  );
  await userEvent.click(
    screen.getByRole("checkbox", { name: "Wohnen / Esszimmer" }),
  );
  expect(saved.catalog.categoryIds).toEqual([
    "chairs",
    "not-in-this-list",
    "dining",
  ]);
  expect(saved.catalog.salesChannelIds).toBeUndefined();
  await userEvent.click(
    screen.getByRole("button", { name: "Remove Wohnen / Stühle" }),
  );
  expect(saved.catalog.categoryIds).toEqual(["not-in-this-list", "dining"]);
  expect(saved.translations).toEqual(newDraft().translations);
});
it("resolves full-locale channel names and makes explicit none distinct from inherited choices", async () => {
  let saved = fixture();
  function Harness() {
    const [draft, setDraft] = useState(saved);
    return (
      <LocaleProvider>
        <ProductAssignments
          draft={draft}
          categories={[]}
          language="it-IT"
          canWrite
          onChange={(next) => {
            saved = next;
            setDraft(next);
          }}
        />
      </LocaleProvider>
    );
  }
  render(<Harness />);
  const channels = screen.getByRole("region", { name: "Sales channels" });
  expect(
    within(channels).getByRole("checkbox", { name: /Mein Shop/ }),
  ).toBeChecked();
  expect(within(channels).getByText("Channel inactive")).toBeVisible();
  expect(within(channels).getByText("Private channel")).toBeVisible();
  expect(
    within(channels).getByText(/selection excludes this product/),
  ).toBeVisible();
  await userEvent.click(
    within(channels).getByRole("checkbox", { name: /Mein Shop/ }),
  );
  expect(saved.catalog.salesChannelIds).toEqual([]);
  expect(
    within(channels).getByText(/not selected for any sales channel/),
  ).toBeVisible();
  await userEvent.click(
    within(channels).getByRole("checkbox", { name: /Marktplatz/ }),
  );
  expect(saved.catalog.salesChannelIds).toEqual(["market"]);
});
it("allows category searching in the actual read-only product editor while closing every assignment mutation", async () => {
  const draft = fixture(),
    request = vi.fn(async (_path: string) => draft),
    user = userEvent.setup();
  render(
    <LocaleProvider>
      <ProductEditor
        id="p1"
        request={request}
        categories={categories}
        onBack={vi.fn()}
        onCreated={vi.fn()}
        canWrite={false}
        initialTab="assignments"
      />
    </LocaleProvider>,
  );
  const search = await screen.findByRole("searchbox", {
    name: "Search categories or paths",
  });
  expect(search).toBeEnabled();
  await user.type(search, "stuhl");
  expect(
    screen.getByRole("checkbox", { name: "Wohnen / Stühle" }),
  ).toBeDisabled();
  expect(
    screen.getByRole("button", { name: "Remove Wohnen / Stühle" }),
  ).toBeDisabled();
  expect(screen.getByRole("checkbox", { name: /Mein Shop/ })).toBeDisabled();
  expect(screen.getByRole("button", { name: "Save product" })).toBeDisabled();
  expect(request.mock.calls.every((call) => call.length === 1)).toBe(true);
});
it("bounds rendered category choices and searches beyond the first batch", () => {
  const many = Array.from({ length: 120 }, (_, index) =>
    category(String(index), `Category ${String(index).padStart(3, "0")}`),
  );
  render(
    <LocaleProvider>
      <ProductAssignments
        draft={fixture()}
        categories={many}
        language="de-DE"
        canWrite
        onChange={vi.fn()}
      />
    </LocaleProvider>,
  );
  const region = screen.getByRole("region", { name: "Categories" });
  expect(within(region).getAllByRole("checkbox")).toHaveLength(51);
  fireEvent.click(screen.getByRole("button", { name: "Show more categories" }));
  expect(within(region).getAllByRole("checkbox")).toHaveLength(101);
  fireEvent.change(
    screen.getByRole("searchbox", { name: "Search categories or paths" }),
    { target: { value: "119" } },
  );
  expect(
    within(region).getByRole("checkbox", { name: "Category 119" }),
  ).toBeVisible();
  expect(within(region).getAllByRole("checkbox")).toHaveLength(2);
});
it("terminates malformed ancestry and preserves explicit empty names without borrowing English", () => {
  const a = category("a", "Deutsch A", "b"),
    b = category("b", "Deutsch B", "a");
  a.data.translations.it = { name: "" };
  a.data.translations.en = { name: "Wrong English" };
  const choices = categoryChoices([a, b], "it-IT", "de-DE");
  expect(choices.map((choice) => choice.label)).toContain("Deutsch B / a");
  expect(
    choices.every((choice) => !choice.label.includes("Wrong English")),
  ).toBe(true);
});
it("saves category and channel selections through the native stock-safe aggregate", async () => {
  const draft = fixture();
  draft.revision = 5;
  draft.contentRevision = 3;
  draft.commerce.stock = 8;
  draft.catalog.productNumber = "ASSIGN-TEST";
  draft.translations.de.name = "Zuordnungstest";
  const request = vi.fn(
    async (_path: string, _body?: unknown, method?: string) =>
      method === "PUT"
        ? { id: "p1", revision: 6, contentRevision: 4, stock: 7 }
        : draft,
  );
  render(
    <LocaleProvider>
      <ProductEditor
        id="p1"
        request={request}
        categories={categories}
        onBack={vi.fn()}
        onCreated={vi.fn()}
        initialTab="assignments"
      />
    </LocaleProvider>,
  );
  await userEvent.click(
    await screen.findByRole("checkbox", { name: "Wohnen / Esszimmer" }),
  );
  await userEvent.click(screen.getByRole("checkbox", { name: /Mein Shop/ }));
  await userEvent.click(screen.getByRole("button", { name: "Save product" }));
  const saved = request.mock.calls.find(
    (call) => call[2] === "PUT",
  )?.[1] as ProductDraft;
  expect(saved.catalog.categoryIds).toEqual([
    "chairs",
    "not-in-this-list",
    "dining",
  ]);
  expect(saved.catalog.salesChannelIds).toEqual([]);
  expect(saved.contentRevision).toBe(3);
  expect(saved.commerce).not.toHaveProperty("stock");
});

it("maps the product editor's short language key back to its enabled regional channel locale", async () => {
  const draft = fixture();
  draft.mainLocale = "en-GB";
  draft.channels![0].data.name = {
    "en-GB": "English Web",
    "de-DE": "Deutscher Shop",
  };
  render(
    <LocaleProvider>
      <ProductEditor
        id="p1"
        request={vi.fn(async (_path: string) => draft)}
        categories={categories}
        onBack={vi.fn()}
        onCreated={vi.fn()}
        initialTab="assignments"
      />
    </LocaleProvider>,
  );
  expect(
    await screen.findByRole("checkbox", { name: /English Web/ }),
  ).toBeChecked();
  await userEvent.selectOptions(
    screen.getByRole("combobox", { name: "Content language" }),
    "de",
  );
  expect(
    screen.getByRole("checkbox", { name: /Deutscher Shop/ }),
  ).toBeChecked();
  expect(
    screen.queryByRole("checkbox", { name: /English Web/ }),
  ).not.toBeInTheDocument();
});

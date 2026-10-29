/** Product navigation retains a single draft, content locale and native review actions across responsive controls. */
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import { LocaleProvider } from "../../src/shared/i18n/i18n";
import ProductEditor from "../../src/admin/catalog/ProductEditor";
import { newDraft } from "../../src/admin/catalog/catalog-model";
import ReviewModeration from "../../src/admin/catalog/ReviewModeration";

it("preserves edits and the fifth content language across keyboard and mobile navigation", async () => {
  const user = userEvent.setup();
  const draft = { ...newDraft(), id: "p1", revision: 7, contentRevision: 5 };
  draft.availableLocales = ["de-DE", "en-GB", "fr-FR", "es-ES", "it-IT"];
  draft.mainLocale = "de-DE";
  draft.catalog.productNumber = "CHAIR-01";
  draft.translations = {
    de: { name: "Form Stuhl", description: null },
    en: { name: "Form Chair", description: null },
    it: { name: null, description: null },
  };
  const request = vi.fn(
    async (_path: string, _body?: unknown, method?: string) =>
      method === "PUT"
        ? { id: "p1", revision: 8, contentRevision: 6, stock: 3 }
        : draft,
  );
  render(
    <LocaleProvider>
      <ProductEditor
        id="p1"
        request={request}
        categories={[]}
        onBack={vi.fn()}
        onCreated={vi.fn()}
      />
    </LocaleProvider>,
  );
  await screen.findByRole("heading", { name: "Form Chair", level: 1 });
  await user.selectOptions(screen.getByLabelText("Content language"), "it");
  expect(
    screen.getByRole("heading", { name: "Form Stuhl", level: 1 }),
  ).toBeVisible();
  const general = screen.getByRole("tab", { name: "General" });
  general.focus();
  await user.keyboard("{ArrowDown}");
  expect(screen.getByRole("tab", { name: "Media" })).toHaveFocus();
  expect(general).toHaveAttribute("aria-selected", "true");
  await user.keyboard("{End}");
  expect(
    screen.getByRole("tab", { name: "Safety & product information" }),
  ).toHaveFocus();
  await user.selectOptions(
    screen.getByRole("combobox", { name: "Product section" }),
    "prices",
  );
  await user.clear(screen.getByLabelText("Price"));
  await user.type(screen.getByLabelText("Price"), "49.95");
  await user.selectOptions(
    screen.getByRole("combobox", { name: "Product section" }),
    "general",
  );
  expect(screen.getByLabelText("Content language")).toHaveValue("it");
  await user.click(screen.getByRole("button", { name: "Save product" }));
  await waitFor(() =>
    expect(request).toHaveBeenCalledWith(
      "/api/merchant/products/p1",
      expect.objectContaining({
        contentRevision: 5,
        commerce: expect.objectContaining({ price: 49.95 }),
        translations: expect.objectContaining({
          it: { name: null, description: null },
        }),
      }),
      "PUT",
    ),
  );
  expect(
    screen.getByRole("heading", { name: "Form Stuhl", level: 1 }),
  ).toBeVisible();
});

it("shows an empty review state only after the native request finishes and publishes existing reviews", async () => {
  const user = userEvent.setup();
  const review = {
    id: "r1",
    productId: "p1",
    title: "Comfortable",
    content: "Good support",
    author: "Customer",
    rating: 5,
    approved: false,
  };
  let complete: (value: unknown) => void = () => {};
  const request = vi.fn((path: string) =>
    path === "/api/merchant/commerce"
      ? new Promise((resolve) => {
          complete = resolve;
        })
      : Promise.resolve({}),
  );
  render(
    <LocaleProvider>
      <ReviewModeration productId="p1" request={request} />
    </LocaleProvider>,
  );
  expect(
    screen.queryByText("No reviews for this product yet"),
  ).not.toBeInTheDocument();
  complete({
    reviews: [
      review,
      { ...review, id: "other", productId: "p2", title: "Another product" },
    ],
  });
  expect(await screen.findByText("Comfortable")).toBeVisible();
  expect(screen.queryByText("Another product")).not.toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Publish" }));
  await waitFor(() =>
    expect(request).toHaveBeenCalledWith(
      "/api/merchant/reviews/r1",
      { approved: true },
      "PUT",
    ),
  );
  expect(await screen.findByRole("button", { name: "Hide" })).toBeVisible();
});

it.each([false, true])(
  "loads creation defaults without a false dirty state or losing typed input (%s)",
  async (typing) => {
    const user = userEvent.setup();
    let finish: (value: unknown) => void = () => {};
    const request = vi.fn(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    render(
      <LocaleProvider>
        <ProductEditor
          id=""
          request={request}
          categories={[]}
          onBack={vi.fn()}
          onCreated={vi.fn()}
        />
      </LocaleProvider>,
    );
    if (typing)
      await user.type(screen.getByLabelText("Product number"), "KEEP-01");
    await act(async () =>
      finish({
        data: {
          locales: ["en-GB", "de-DE"],
          mainLocale: "en-GB",
          currencies: { baseCurrency: "USD" },
        },
      }),
    );
    if (typing) {
      expect(screen.getByLabelText("Product number")).toHaveValue("KEEP-01");
      expect(screen.getByRole("status")).toHaveTextContent("Unsaved changes");
    } else
      expect(screen.queryByText("Unsaved changes")).not.toBeInTheDocument();
  },
);

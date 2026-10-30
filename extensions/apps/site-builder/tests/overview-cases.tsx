/** Overview follows real channel inheritance and preserves the existing editor when moving between pages. */
import {
  render,
  screen,
  fireEvent,
  expect,
  it,
  vi,
  waitFor,
} from "../../../../frontend/tests/unit/package-test-support";
import ShopDesigner from "../studio/ShopDesigner";
import { newPage } from "../model";
import { overviewPages, overviewTheme } from "../studio/overview-model";
import { LocaleScope } from "../../../../frontend/src/shared/i18n/i18n";

const global = {
  ...newPage("*", "en-GB", "Global home"),
  revision: 1,
  slug: "home",
  theme: { accent: "#003399", font: "serif" as const },
};
const home = {
  ...newPage("default", "en-GB", "Current home"),
  revision: 2,
  slug: "home",
  theme: { columns: 4 },
};
const about = {
  ...newPage("default", "en-GB", "About us"),
  revision: 3,
  slug: "about",
  theme: { radius: 0 },
};

it("combines global design, channel overrides and an unsaved home without copying a different channel", () => {
  const foreign = {
    ...home,
    id: "foreign",
    channel: "other",
    theme: { accent: "#ffffff" },
  };
  const draft = { ...home, theme: { accent: "#cc0000", columns: 2 } };
  expect(
    overviewPages([global, home, about, foreign], "default", draft).map(
      (p) => p.id,
    ),
  ).toEqual([home.id, about.id]);
  expect(
    overviewTheme([global, home, about, foreign], "default", about, draft),
  ).toMatchObject({ accent: "#cc0000", font: "serif", columns: 2, radius: 0 });
  expect(home.theme).toEqual({ columns: 4 });
});

it("keeps archived channel overrides hidden instead of showing an inherited global page", () => {
  expect(
    overviewPages([global, { ...home, status: "archived" }], "default"),
  ).toEqual([]);
});

it("opens the selected real page and retains a typed agent request when returning from the overview", async () => {
  const context = {
    channels: [{ id: "default", data: { name: { "en-GB": "Main" } } }],
    mainLocale: "en-GB",
    locales: ["en-GB"],
    installed: ["site_builder", "site_forms"],
    catalogue: { elements: [] },
    elements: [],
  };
  const request = vi.fn(async (path: string) =>
    path.includes("/context") ? context : { elements: [home, about] },
  );
  render(
    <ShopDesigner
      request={request}
      workspace="test"
      rights={["channels.read", "channels.manage", "assistant.use"]}
      sandbox
      onEnvironments={() => {}}
    />,
  );
  fireEvent.click(await screen.findByRole("tab", { name: "Agent" }));
  const prompt = screen.getByRole("textbox", {
    name: "Was möchtest du ändern?",
  });
  fireEvent.change(prompt, { target: { value: "Make the whole shop calmer" } });
  fireEvent.click(screen.getByRole("button", { name: "Seitenübersicht" }));
  expect(
    await screen.findByRole("button", { name: "Seite bearbeiten: About us" }),
  ).toBeVisible();
  expect(
    screen.queryByRole("textbox", { name: "Was möchtest du ändern?" }),
  ).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Seitenübersicht" }));
  expect(
    screen.getByRole("textbox", { name: "Was möchtest du ändern?" }),
  ).toHaveValue("Make the whole shop calmer");
  fireEvent.click(screen.getByRole("button", { name: "Seitenübersicht" }));
  fireEvent.click(
    screen.getByRole("button", { name: "Seite bearbeiten: About us" }),
  );
  await waitFor(() =>
    expect(
      screen.getAllByRole("heading", { name: "About us" }).length,
    ).toBeGreaterThan(0),
  );
  expect(request.mock.calls.some(([path]) => path.includes("save_page"))).toBe(
    false,
  );
});

it("returns to the same unsaved page without discarding its dirty state or undo history", async () => {
  const request = vi.fn(async (path: string) =>
    path.includes("/context")
      ? {
          channels: [{ id: "default", data: { name: { "en-GB": "Main" } } }],
          mainLocale: "en-GB",
          locales: ["en-GB"],
          installed: ["site_builder", "site_forms"],
          catalogue: { elements: [] },
        }
      : { elements: [home, about] },
  );
  render(
    <LocaleScope locale="en-GB">
      <ShopDesigner
        request={request}
        workspace="dirty-overview"
        rights={["channels.manage"]}
        sandbox
        onEnvironments={() => {}}
      />
    </LocaleScope>,
  );
  fireEvent.click(await screen.findByRole("tab", { name: "Elements" }));
  fireEvent.click(screen.getByRole("button", { name: /Image.*A photograph/ }));
  const inserted = document
    .querySelector("[data-block-id].selected")
    ?.getAttribute("data-block-id");
  const count = document.querySelectorAll("[data-block-id]").length;
  expect(screen.getByRole("button", { name: "Save draft" })).toBeEnabled();
  fireEvent.click(screen.getByRole("button", { name: "Page overview" }));
  fireEvent.click(
    screen.getByRole("button", { name: "Edit page: Current home" }),
  );
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(screen.getByRole("button", { name: "Save draft" })).toBeEnabled();
  expect(document.querySelectorAll("[data-block-id]")).toHaveLength(count);
  if (inserted)
    expect(document.querySelector("[data-block-id].selected")).toHaveAttribute(
      "data-block-id",
      inserted,
    );
  const undo = document.querySelector(
    '.designer-preview-bar [aria-label="Undo"]',
  )!;
  expect(undo).toBeEnabled();
  fireEvent.click(undo);
  expect(document.querySelectorAll("[data-block-id]")).toHaveLength(count - 1);
  expect(screen.getByRole("button", { name: "Save draft" })).toBeDisabled();
  expect(request.mock.calls.some(([path]) => path.includes("save_page"))).toBe(
    false,
  );
});

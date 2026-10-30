/** Saved tests remain reloadable; late starts cannot overwrite a different sandbox's URL. */
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { expect, it, vi } from "vitest";
import ScenarioStudio from "../../src/admin/scenarios/ScenarioStudio";
import { scenarioLabel } from "../../src/admin/scenarios/scenario-history";
import { LocaleProvider } from "../../src/shared/i18n/i18n";
import { scenarioRights } from "../../src/admin/scenarios/scenario-access";
const studio = vi.hoisted(() => ({
  environment: "draft",
  access: [] as string[],
  selectTab: vi.fn(),
}));
vi.mock("../../src/admin/shell/StudioContext", () => ({
  useStudio: () => studio,
}));
const list = {
  scenarios: [{ id: "old", title: "Same title", members: 1 }],
  configuration: {
    channel: "web",
    mainLocale: "en-GB",
    locales: ["en-GB"],
    countries: ["GB"],
    currency: "EUR",
    scale: 2,
  },
};
it("distinguishes repeated names and same-second runs in the interface language, including legacy dates", () => {
  const item = {
    id: "abcdefgh-1",
    title: "Same title",
    members: 1,
    updatedAt: "2026-10-30T12:10:53Z",
  };
  expect(scenarioLabel(item, "de-DE")).toContain("30.10.2026");
  expect(scenarioLabel(item, "en-GB")).not.toBe(
    scenarioLabel({ ...item, id: "ijklmnop-2" }, "en-GB"),
  );
  expect(scenarioLabel({ ...item, updatedAt: "bad" }, "de-DE")).toBe(
    "Same title · abcdefgh",
  );
});
it("retains edited inputs when the parent reads back the new URL and reopens that result on remount", async () => {
  studio.environment = "draft";
  studio.access = [...scenarioRights];
  history.replaceState(null, "", "/?scenarioId=old&shop=unit-shop#merchant");
  const api = vi.fn(async (path: string, body?: unknown) =>
    body || path.endsWith("/new")
      ? { id: "new", runs: [] }
      : path.endsWith("/old")
        ? { id: "old", runs: [] }
        : list,
  );
  const show = (id: string) => (
    <LocaleProvider>
      <ScenarioStudio request={api} channel="web" initialScenarioId={id} />
    </LocaleProvider>
  );
  const view = render(show("old"));
  const field = await screen.findByLabelText("What should the customers try?");
  await screen.findByLabelText("Saved tests");
  fireEvent.change(field, { target: { value: "My edited brief" } });
  fireEvent.click(screen.getByRole("button", { name: "Let customers test" }));
  await waitFor(() =>
    expect(new URL(location.href).searchParams.get("scenarioId")).toBe("new"),
  );
  view.rerender(show("new"));
  expect(field).toHaveValue("My edited brief");
  view.unmount();
  api.mockClear();
  render(show(new URL(location.href).searchParams.get("scenarioId")!));
  await waitFor(() =>
    expect(api).toHaveBeenCalledWith(
      "/api/agent/scenarios/new",
      undefined,
      undefined,
      { salesChannel: "web" },
    ),
  );
});
it("does not remember a late successful start after changing scope", async () => {
  studio.environment = "draft";
  studio.access = [...scenarioRights];
  history.replaceState(null, "", "/?scenarioId=old#merchant");
  let resolve!: (value: unknown) => void;
  const api = vi.fn(async (_path: string, body?: unknown) =>
    body
      ? new Promise((r) => {
          resolve = r;
        })
      : list,
  );
  const fresh = vi.fn(async () => list);
  const view = render(
    <LocaleProvider>
      <ScenarioStudio request={api} />
    </LocaleProvider>,
  );
  const field = await screen.findByLabelText("What should the customers try?");
  await screen.findByLabelText("Saved tests");
  fireEvent.change(field, { target: { value: "Try the shop" } });
  fireEvent.click(screen.getByRole("button", { name: "Let customers test" }));
  await waitFor(() => expect(resolve).toBeDefined());
  studio.environment = "another-draft";
  view.rerender(
    <LocaleProvider>
      <ScenarioStudio request={fresh} />
    </LocaleProvider>,
  );
  history.replaceState(null, "", "/?scenarioId=other#merchant");
  await act(async () => resolve({ id: "late", runs: [] }));
  expect(new URL(location.href).searchParams.get("scenarioId")).toBe("other");
});

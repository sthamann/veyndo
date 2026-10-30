/** Saved evidence stays private to its sandbox/actor and never submits a release. */
import {
  act,
  fireEvent,
  render as baseRender,
  screen,
  waitFor,
} from "@testing-library/react";
import { expect, it, vi } from "vitest";
import ReleaseScenarios from "../../src/admin/environments/ReleaseScenarios";
import { scenarioRights } from "../../src/admin/scenarios/scenario-access";
import type { Report } from "../../src/admin/scenarios/scenario-types";
import { LocaleProvider } from "../../src/shared/i18n/i18n";
const render = (ui: React.ReactNode) =>
  baseRender(ui, { wrapper: LocaleProvider });
const profile = {
  id: "buyer",
  name: "Careful customer",
  goal: "Buy a chair",
  budgetMinor: 10000,
  locale: "en-GB",
  country: "GB",
};
function report(review: "current" | "stale" = "current"): Report {
  return {
    id: "saved",
    runs: [
      {
        taskId: "run",
        state: "ready",
        revision: 2,
        configurationReview: review,
        scenario: {
          profile,
          instruction: "Buy a chair",
          index: 0,
          currency: "EUR",
          scale: 2,
          channel: "summer",
        },
        preview: {
          scenario: {
            profile,
            outcome: "purchased",
            orderId: "private-order",
            totalMinor: 5000,
            currency: "EUR",
            scale: 2,
            steps: [],
          },
        },
      },
    ],
  };
}
const list = {
  scenarios: [{ id: "saved", title: "Summer customers", members: 1 }],
};
it("requires every native scenario right and stops exposing results on revocation", async () => {
  const request = vi.fn(async () => list),
    factory = () => request;
  const view = render(
    <ReleaseScenarios
      environment="draft"
      rights={scenarioRights.slice(1)}
      sandboxRequest={factory}
      onOpen={vi.fn()}
    />,
  );
  expect(request).not.toHaveBeenCalled();
  view.rerender(
    <ReleaseScenarios
      environment="draft"
      rights={scenarioRights}
      sandboxRequest={factory}
      onOpen={vi.fn()}
    />,
  );
  await screen.findByRole("option", { name: /Summer customers/ });
  view.rerender(
    <ReleaseScenarios
      environment="draft"
      rights={[]}
      sandboxRequest={factory}
      onOpen={vi.fn()}
    />,
  );
  expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
});
it("refreshes configuration evidence and opens the exact saved test without releasing", async () => {
  let review: "current" | "stale" = "current";
  const request = vi.fn(async (path: string) =>
    path.endsWith("/saved") ? report(review) : list,
  );
  const onOpen = vi.fn(async () => {});
  render(
    <ReleaseScenarios
      environment="draft"
      rights={scenarioRights}
      sandboxRequest={() => request}
      onOpen={onOpen}
    />,
  );
  await screen.findByRole("option", { name: /Summer customers/ });
  fireEvent.change(screen.getByRole("combobox"), {
    target: { value: "saved" },
  });
  await screen.findByText(
    "Configuration at the start and end matches the current shop.",
  );
  review = "stale";
  fireEvent.click(
    screen.getByRole("button", {
      name: "Refresh tests and configuration check",
    }),
  );
  await screen.findByText(/Your shop has changed since this test/);
  fireEvent.click(
    screen.getByRole("button", { name: "Open this test and repeat" }),
  );
  await waitFor(() =>
    expect(onOpen).toHaveBeenCalledWith("draft", "summer", "saved"),
  );
  expect(
    request.mock.calls.every(([path]) =>
      path.startsWith("/api/agent/scenarios"),
    ),
  ).toBe(true);
  expect(
    screen.queryByRole("button", { name: /Publish/ }),
  ).not.toBeInTheDocument();
});
it("discards a late report after switching sandbox requests", async () => {
  let resolve!: (value: Report) => void;
  const first = vi.fn(async (path: string) =>
    path.endsWith("/saved")
      ? new Promise<Report>((r) => {
          resolve = r;
        })
      : list,
  );
  const second = vi.fn(async () => ({ scenarios: [] }));
  const factory = (env: string) => (env === "first" ? first : second);
  const view = render(
    <ReleaseScenarios
      environment="first"
      rights={scenarioRights}
      sandboxRequest={factory}
      onOpen={vi.fn()}
    />,
  );
  await screen.findByRole("option", { name: /Summer customers/ });
  fireEvent.change(screen.getByRole("combobox"), {
    target: { value: "saved" },
  });
  await waitFor(() => expect(resolve).toBeDefined());
  view.rerender(
    <ReleaseScenarios
      environment="second"
      rights={scenarioRights}
      sandboxRequest={factory}
      onOpen={vi.fn()}
    />,
  );
  await screen.findByText(
    "You have no saved customer tests in this sandbox yet.",
  );
  await act(async () => resolve(report()));
  expect(screen.queryByText("Careful customer")).not.toBeInTheDocument();
  expect(screen.queryByText("private-order")).not.toBeInTheDocument();
  expect(second).toHaveBeenCalledTimes(1);
});
it("offers retry after loading or navigation fails", async () => {
  const request = vi
    .fn()
    .mockRejectedValueOnce(new Error("offline"))
    .mockResolvedValue({ scenarios: [] });
  render(
    <ReleaseScenarios
      environment="draft"
      rights={scenarioRights}
      sandboxRequest={() => request}
      onOpen={async () => {
        throw new Error("refresh failed");
      }}
    />,
  );
  await screen.findByText(/The customer tests could not be loaded/);
  fireEvent.click(
    screen.getByRole("button", {
      name: "Refresh tests and configuration check",
    }),
  );
  await screen.findByText(
    "You have no saved customer tests in this sandbox yet.",
  );
  fireEvent.click(
    screen.getByRole("button", { name: "Prepare customer test" }),
  );
  await screen.findByText(/The customer test could not be opened/);
  expect(
    screen.getByRole("button", { name: "Prepare customer test" }),
  ).toBeEnabled();
});

it("drops cached reports when the owning session changes with the same sandbox factory", async () => {
  const request = vi.fn(async (path: string) =>
    path.endsWith("/saved") ? report() : list,
  );
  const factory = () => request;
  const props = {
    environment: "draft",
    rights: scenarioRights,
    sandboxRequest: factory,
    onOpen: vi.fn(),
  };
  const view = render(<ReleaseScenarios {...props} scope={{}} />);
  await screen.findByRole("option", { name: /Summer customers/ });
  fireEvent.change(screen.getByRole("combobox"), {
    target: { value: "saved" },
  });
  await screen.findByText("Careful customer");
  view.rerender(<ReleaseScenarios {...props} scope={{}} />);
  expect(screen.queryByText("Careful customer")).not.toBeInTheDocument();
  await waitFor(() => expect(request).toHaveBeenCalledTimes(3));
  expect(screen.getByRole("combobox")).toHaveValue("");
});

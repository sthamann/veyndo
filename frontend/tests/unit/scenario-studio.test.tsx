/** A live shop cannot start fictional purchases; failed starts keep the editable customer brief. */
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, afterEach, expect, it, vi } from "vitest";
import ScenarioComparison from "../../src/admin/scenarios/ScenarioComparison";
import ScenarioStudio from "../../src/admin/scenarios/ScenarioStudio";
import { LocaleProvider } from "../../src/shared/i18n/i18n";
const studio = vi.hoisted(() => ({
  environment: "",
  access: [
    "assistant.use",
    "catalog.read",
    "channels.read",
    "environments.manage",
    "orders.write",
    "orders.read",
    "knowledge.read",
  ],
  selectTab: vi.fn(),
}));
vi.mock("../../src/admin/shell/StudioContext", () => ({
  useStudio: () => studio,
}));
beforeEach(() => localStorage.setItem("rac-locale", "de-DE"));
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
const request = vi.fn(
  async (path: string, _body?: unknown, method?: string) => {
    if (method === "POST") throw new Error("Capacity busy");
    if (path === "/api/merchant/commerce")
      return {
        data: {
          mainLocale: "de-DE",
          locales: ["de-DE"],
          countries: ["DE"],
          currencies: { defaultCurrency: "EUR" },
        },
      };
    return {
      scenarios: [],
      configuration: {
        mainLocale: "de-DE",
        locales: ["de-DE"],
        countries: ["DE"],
        currency: "EUR",
        scale: 2,
      },
    };
  },
);
function show() {
  localStorage.setItem("rac-locale", "de-DE");
  render(
    <LocaleProvider>
      <ScenarioStudio request={request} />
    </LocaleProvider>,
  );
}
it("requires a private sandbox before any test can start", async () => {
  studio.environment = "";
  show();
  expect(screen.getByRole("button", { name: "Sandbox öffnen" })).toBeVisible();
  expect(
    screen.queryByRole("button", { name: "Kunden testen lassen" }),
  ).not.toBeInTheDocument();
  expect(request).not.toHaveBeenCalled();
});
it("keeps edited goals after a rejected start and never reports an unobserved success", async () => {
  studio.environment = "private-test";
  show();
  const field = await screen.findByLabelText(
    "Was sollen die Kunden versuchen?",
  );
  await userEvent.type(field, "Eine Lampe unter 100 Euro kaufen");
  await userEvent.click(
    screen.getByRole("button", { name: "Kunden testen lassen" }),
  );
  expect(await screen.findByRole("alert")).toHaveTextContent("Capacity busy");
  expect(field).toHaveValue("Eine Lampe unter 100 Euro kaufen");
  expect(screen.queryByText("Kauf abgeschlossen")).not.toBeInTheDocument();
});

it("drops late results and edited profiles when the shop scope changes", async () => {
  studio.environment = "sandbox-a";
  let resolve!: (value: unknown) => void;
  const old = vi.fn(
    () =>
      new Promise((r) => {
        resolve = r;
      }),
  );
  const fresh = vi.fn(async () => ({
    scenarios: [],
    configuration: {
      channel: "default",
      mainLocale: "fr-FR",
      locales: ["fr-FR"],
      countries: ["FR"],
      currency: "EUR",
      scale: 2,
    },
  }));
  const view = render(
    <LocaleProvider>
      <ScenarioStudio request={old} />
    </LocaleProvider>,
  );
  studio.environment = "sandbox-b";
  view.rerender(
    <LocaleProvider>
      <ScenarioStudio request={fresh} />
    </LocaleProvider>,
  );
  expect(await screen.findAllByDisplayValue("FR")).toHaveLength(3);
  resolve({
    scenarios: [{ id: "foreign", title: "Other shop secret" }],
    configuration: {
      channel: "default",
      mainLocale: "de-DE",
      locales: ["de-DE"],
      countries: ["DE"],
      currency: "EUR",
      scale: 2,
    },
  });
  await new Promise((r) => setTimeout(r, 0));
  expect(screen.queryByText("Other shop secret")).not.toBeInTheDocument();
  expect(screen.queryByDisplayValue("DE")).not.toBeInTheDocument();
});

it("repeats saved customer conditions and uses the selected native channel", async () => {
  studio.environment = "sandbox-repeat";
  const profile = {
    id: "returning",
    name: "Budget desk buyer",
    goal: "Buy a desk",
    budgetMinor: 12345,
    locale: "de-DE",
    country: "DE",
  };
  const saved = {
    id: "baseline",
    runs: [
      {
        taskId: "run",
        state: "ready",
        revision: 2,
        scenario: {
          profile,
          instruction: "Office setup",
          index: 0,
          currency: "EUR",
          scale: 2,
          channel: "web",
          comparisonDigest: "same",
          inference: { provider: "openai", model: "test-model" },
        },
        preview: { scenario: { profile, outcome: "blocked", steps: [] } },
      },
    ],
  };
  const api = vi.fn(async (path: string, body?: unknown) =>
    path.endsWith("/baseline")
      ? saved
      : body || path.endsWith("/candidate")
        ? { id: "candidate", runs: [] }
        : {
            scenarios: [{ id: "baseline", title: "First test", members: 1 }],
            configuration: {
              channel: "web",
              mainLocale: "de-DE",
              locales: ["de-DE"],
              countries: ["DE"],
              currency: "EUR",
              scale: 2,
            },
          },
  );
  render(
    <LocaleProvider>
      <ScenarioStudio request={api} channel="web" />
    </LocaleProvider>,
  );
  await userEvent.selectOptions(
    await screen.findByLabelText("Gespeicherte Tests"),
    "baseline",
  );
  await userEvent.click(
    await screen.findByRole("button", { name: "Diese Kunden erneut testen" }),
  );
  expect(screen.getByLabelText("Was sollen die Kunden versuchen?")).toHaveValue(
    "Office setup",
  );
  expect(screen.getByLabelText("Kundenprofil")).toHaveValue(
    "Budget desk buyer",
  );
  expect(
    screen.queryByRole("heading", { name: "Vorheriger Test" }),
  ).not.toBeInTheDocument();
  await userEvent.click(
    screen.getByRole("button", { name: "Kunden testen lassen" }),
  );
  const post = api.mock.calls.find((call) => call[1]);
  expect(post?.[1]).toMatchObject({
    profiles: [profile],
    inference: { provider: "openai", model: "test-model" },
    instruction: "Office setup",
  });
  expect(api).toHaveBeenCalledWith(
    "/api/agent/scenarios",
    expect.anything(),
    "POST",
    { salesChannel: "web" },
  );
});

it("restarts result polling after explicitly resuming an interrupted customer", async () => {
  studio.environment = "sandbox-resume";
  let reads = 0,
    resumed = false;
  const profile = {
    id: "a",
    name: "Test customer",
    goal: "Buy",
    budgetMinor: 10000,
    locale: "de-DE",
    country: "DE",
  };
  const api = vi.fn(async (path: string) => {
    if (path.endsWith("/resume")) {
      resumed = true;
      return {};
    }
    if (path.endsWith("/saved")) {
      reads++;
      const ready = resumed && reads > 2;
      return {
        id: "saved",
        runs: [
          {
            taskId: "run",
            revision: reads,
            state: ready ? "ready" : resumed ? "queued" : "uncertain",
            scenario: { profile },
            ...(ready
              ? {
                  preview: {
                    scenario: {
                      profile,
                      outcome: "purchased",
                      steps: [],
                      orderId: "test-order",
                    },
                  },
                }
              : {}),
          },
        ],
      };
    }
    return {
      scenarios: [{ id: "saved", title: "Interrupted test" }],
      configuration: {
        channel: "default",
        mainLocale: "de-DE",
        locales: ["de-DE"],
        countries: ["DE"],
        currency: "EUR",
        scale: 2,
      },
    };
  });
  render(
    <LocaleProvider>
      <ScenarioStudio request={api} />
    </LocaleProvider>,
  );
  await userEvent.selectOptions(
    await screen.findByLabelText("Gespeicherte Tests"),
    "saved",
  );
  await userEvent.click(
    await screen.findByRole("button", { name: "Bewusst fortsetzen" }),
  );
  expect(await screen.findByText("Kauf abgeschlossen")).toBeVisible();
  expect(screen.getByText("test-order")).toBeVisible();
});

it("does not replace the newly selected report with a late control response", async () => {
  studio.environment = "sandbox-selected";
  let resume!: () => void;
  let bReads = 0;
  const report = (id: string) => ({
    id,
    runs: [
      {
        taskId: id,
        revision: 1,
        state: "uncertain",
        scenario: {
          profile: {
            id,
            name: `Customer ${id}`,
            goal: "Buy",
            budgetMinor: 10000,
            locale: "de-DE",
            country: "DE",
          },
        },
      },
    ],
  });
  const api = vi.fn(async (path: string) => {
    if (path.endsWith("/resume"))
      return new Promise<void>((r) => {
        resume = r;
      });
    if (path.endsWith("/a")) return report("a");
    if (path.endsWith("/b")) {
      if (++bReads > 1) return new Promise(() => {});
      return report("b");
    }
    return {
      scenarios: [
        { id: "a", title: "A" },
        { id: "b", title: "B" },
      ],
      configuration: {
        channel: "default",
        mainLocale: "de-DE",
        locales: ["de-DE"],
        countries: ["DE"],
        currency: "EUR",
        scale: 2,
      },
    };
  });
  render(
    <LocaleProvider>
      <ScenarioStudio request={api} />
    </LocaleProvider>,
  );
  await userEvent.selectOptions(
    await screen.findByLabelText("Gespeicherte Tests"),
    "a",
  );
  await userEvent.click(
    await screen.findByRole("button", { name: "Bewusst fortsetzen" }),
  );
  await userEvent.selectOptions(
    screen.getByLabelText("Gespeicherte Tests"),
    "b",
  );
  expect(await screen.findByText("Customer b")).toBeVisible();
  resume();
  await new Promise((r) => setTimeout(r, 10));
  expect(screen.queryByText("Customer a")).not.toBeInTheDocument();
  expect(screen.getByText("Customer b")).toBeVisible();
});

it("waits for complete snapshots before claiming a changed shop", () => {
  const profile = {
    id: "a",
    name: "A",
    goal: "Buy",
    budgetMinor: 10000,
    locale: "de-DE",
    country: "DE",
  };
  const scenario = {
    profile,
    index: 0,
    instruction: "Buy",
    currency: "EUR",
    scale: 2,
    channel: "default",
    comparisonDigest: "same",
  };
  const before = {
    id: "before",
    runs: [
      {
        taskId: "a",
        state: "ready",
        revision: 1,
        scenario,
        preview: {
          scenario: {
            profile,
            steps: [],
            outcome: "purchased",
            snapshotDigest: "original",
          },
        },
      },
    ],
  };
  const after = {
    id: "after",
    runs: [{ taskId: "b", state: "running", revision: 1, scenario }],
  };
  const view = render(
    <LocaleProvider>
      <ScenarioComparison before={before} after={after} />
    </LocaleProvider>,
  );
  expect(screen.getByText(/Der Shop-Vergleich folgt/)).toBeVisible();
  expect(
    screen.queryByText(
      /Shop-Konfiguration oder betrachteter Katalog verändert/,
    ),
  ).not.toBeInTheDocument();
  view.rerender(
    <LocaleProvider>
      <ScenarioComparison
        before={before}
        after={{
          ...after,
          runs: [
            {
              ...after.runs[0],
              state: "ready",
              preview: {
                scenario: {
                  profile,
                  steps: [],
                  outcome: "blocked",
                  snapshotDigest: "changed",
                },
              },
            },
          ],
        }}
      />
    </LocaleProvider>,
  );
  expect(
    screen.getByText(/Shop-Konfiguration oder betrachteter Katalog verändert/),
  ).toBeVisible();
});

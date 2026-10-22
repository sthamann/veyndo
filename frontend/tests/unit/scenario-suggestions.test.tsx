/** Catalogue suggestions are editable drafts, use native minor units and never start a customer run. */
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import ScenarioSuggestions from "../../src/admin/scenarios/ScenarioSuggestions";
import { LocaleProvider } from "../../src/shared/i18n/i18n";
const config = {
  channel: "web",
  mainLocale: "it-IT",
  locales: ["it-IT", "de-DE"],
  countries: ["AT", "DE"],
  currency: "EUR",
  scale: 2,
  catalogue: [
    { id: "lamp", name: "Lampada", priceMinor: 2890, stock: 10 },
    { id: "desk", name: "Scrivania", priceMinor: 29900, stock: 0 },
  ],
};
beforeEach(() => localStorage.setItem("rac-locale", "de-DE"));
afterEach(cleanup);
it("prepares shop-specific editable customers without replacing the brief or starting a run", async () => {
  localStorage.setItem("rac-locale", "de-DE");
  const apply = vi.fn();
  render(
    <LocaleProvider>
      <ScenarioSuggestions config={config} onApply={apply} />
    </LocaleProvider>,
  );
  await userEvent.click(
    screen.getByRole("button", { name: "Testkunden aus meinem Sortiment" }),
  );
  expect(apply).not.toHaveBeenCalled();
  expect(screen.getAllByText("Lampada")).toHaveLength(2);
  expect(screen.getByText("Scrivania")).toBeVisible();
  await userEvent.click(
    screen.getByRole("button", { name: "Diese Vorschläge übernehmen" }),
  );
  const profiles = apply.mock.calls[0][0];
  expect(profiles).toHaveLength(3);
  expect(profiles.map((p: { goal: string }) => p.goal).join(" ")).toContain(
    "Lampada",
  );
  expect(profiles[0].budgetMinor).toBe(2889);
  expect(profiles[1].budgetMinor).toBe(3468);
  expect(profiles[2].goal).toContain("Scrivania");
  expect(profiles[2].country).toBe("DE");
  expect(profiles[1].locale).toBe("de-DE");
});
it("explains an empty catalogue and cannot manufacture products or customer facts", async () => {
  const apply = vi.fn();
  render(
    <LocaleProvider>
      <ScenarioSuggestions
        config={{ ...config, catalogue: [] }}
        onApply={apply}
      />
    </LocaleProvider>,
  );
  await userEvent.click(
    screen.getByRole("button", { name: "Testkunden aus meinem Sortiment" }),
  );
  expect(screen.getByText(/keine passenden Produkte/)).toBeVisible();
  expect(
    screen.queryByRole("button", { name: "Diese Vorschläge übernehmen" }),
  ).not.toBeInTheDocument();
  expect(apply).not.toHaveBeenCalled();
});
it("rebuilds the preview when channel context changes and respects zero digit currencies", async () => {
  const apply = vi.fn();
  const view = render(
    <LocaleProvider>
      <ScenarioSuggestions config={config} onApply={apply} />
    </LocaleProvider>,
  );
  await userEvent.click(
    screen.getByRole("button", { name: "Testkunden aus meinem Sortiment" }),
  );
  const next = {
    ...config,
    channel: "jp",
    currency: "JPY",
    scale: 0,
    countries: ["JP"],
    locales: ["ja-JP"],
    mainLocale: "ja-JP",
    catalogue: [
      { id: "new", name: "New channel only", priceMinor: 100, stock: 3 },
    ],
  };
  view.rerender(
    <LocaleProvider>
      <ScenarioSuggestions config={next} onApply={apply} />
    </LocaleProvider>,
  );
  expect(screen.queryByText("Lampada")).not.toBeInTheDocument();
  await userEvent.click(
    screen.getByRole("button", { name: "Diese Vorschläge übernehmen" }),
  );
  expect(apply.mock.calls[0][0][0].budgetMinor).toBe(99);
  expect(apply.mock.calls[0][0][2]).toMatchObject({
    country: "JP",
    locale: "ja-JP",
    budgetMinor: 120,
  });
});

it("uses enabled channel languages when the shop main language is excluded, and keeps three-digit budgets", async () => {
  const apply = vi.fn();
  render(
    <LocaleProvider>
      <ScenarioSuggestions
        config={{
          ...config,
          mainLocale: "en-GB",
          locales: ["ja-JP"],
          currency: "KWD",
          scale: 3,
          catalogue: [{ id: "x", name: "Seven", priceMinor: 7123, stock: 1 }],
        }}
        onApply={apply}
      />
    </LocaleProvider>,
  );
  await userEvent.click(
    screen.getByRole("button", { name: "Testkunden aus meinem Sortiment" }),
  );
  await userEvent.click(
    screen.getByRole("button", { name: "Diese Vorschläge übernehmen" }),
  );
  expect(
    apply.mock.calls[0][0].map((p: { locale: string }) => p.locale),
  ).toEqual(["ja-JP", "ja-JP", "ja-JP"]);
  expect(
    apply.mock.calls[0][0].map((p: { budgetMinor: number }) => p.budgetMinor),
  ).toEqual([7122, 8548, 8548]);
});

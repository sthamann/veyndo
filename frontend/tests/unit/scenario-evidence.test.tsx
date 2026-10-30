/** A successful purchase never substitutes for evidence about the current configuration. */
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it } from "vitest";
import ScenarioEvidence from "../../src/admin/scenarios/ScenarioEvidence";
import { LocaleProvider } from "../../src/shared/i18n/i18n";
import type { Run } from "../../src/admin/scenarios/scenario-types";
beforeEach(() => localStorage.setItem("rac-locale", "de-DE"));
afterEach(cleanup);
const run: Run = {
  taskId: "purchase",
  state: "ready",
  revision: 1,
  preview: {
    scenario: {
      profile: {
        id: "a",
        name: "Anna",
        goal: "Buy",
        budgetMinor: 10000,
        locale: "de-DE",
        country: "DE",
      },
      outcome: "purchased",
      steps: [],
    },
  },
};
it.each([
  ["current", "bei Start und Abschluss"],
  ["stale", "vor der Veröffentlichungsprüfung erneut"],
  ["changed_during_run", "während des Tests geändert"],
  ["unverified", "Konfigurationsvergleich ist nicht verfügbar"],
] as const)(
  "explains %s independently of purchase success",
  (configurationReview, message) => {
    render(
      <LocaleProvider>
        <ScenarioEvidence run={{ ...run, configurationReview }} />
      </LocaleProvider>,
    );
    expect(screen.getByRole("status")).toHaveTextContent(message);
  },
);
it("does not manufacture evidence for legacy results or unfinished runs", () => {
  const view = render(
    <LocaleProvider>
      <ScenarioEvidence run={run} />
    </LocaleProvider>,
  );
  expect(screen.getByRole("status")).toHaveTextContent(
    "Konfigurationsvergleich ist nicht verfügbar",
  );
  view.rerender(
    <LocaleProvider>
      <ScenarioEvidence
        run={{ ...run, state: "running", preview: undefined }}
      />
    </LocaleProvider>,
  );
  expect(screen.queryByRole("status")).not.toBeInTheDocument();
});

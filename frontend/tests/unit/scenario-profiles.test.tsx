/** Fictional customer inputs use readable locale names and the shared searchable destination picker. */
import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it } from "vitest";
import ScenarioProfiles from "../../src/admin/scenarios/ScenarioProfiles";
import { LocaleProvider } from "../../src/shared/i18n/i18n";
import type { Profile } from "../../src/admin/scenarios/scenario-types";
function Profiles() {
  const [profiles, setProfiles] = useState<Profile[]>([
    {
      id: "a",
      name: "A",
      goal: "Buy",
      budgetMinor: 10000,
      country: "DE",
      locale: "de-DE",
    },
  ]);
  return (
    <>
      <ScenarioProfiles
        profiles={profiles}
        onChange={setProfiles}
        config={{
          channel: "default",
          mainLocale: "de-DE",
          locales: ["de-DE", "it-IT"],
          countries: ["DE", "AT"],
          currency: "EUR",
          scale: 2,
        }}
      />
      <output>{JSON.stringify(profiles)}</output>
    </>
  );
}
it("shows translated language and country names while submitting only the channel's original codes", async () => {
  localStorage.setItem("rac-locale", "de-DE");
  render(<Profiles />, { wrapper: LocaleProvider });
  expect(
    screen.getByRole("option", { name: "Deutsch (Deutschland)" }),
  ).toHaveValue("de-DE");
  expect(screen.getByText("Deutschland")).toBeVisible();
  await userEvent.type(
    screen.getByRole("combobox", { name: "Land" }),
    "Österreich",
  );
  await userEvent.click(screen.getByRole("option", { name: /Österreich/ }));
  await userEvent.selectOptions(
    screen.getByRole("combobox", { name: "Sprache" }),
    "it-IT",
  );
  expect(screen.getByRole("status")).toHaveTextContent('"country":"AT"');
  expect(screen.getByRole("status")).toHaveTextContent('"locale":"it-IT"');
  await userEvent.clear(screen.getByRole("combobox", { name: "Land" }));
  await userEvent.type(
    screen.getByRole("combobox", { name: "Land" }),
    "Frankreich",
  );
  expect(
    screen.queryByRole("option", { name: /Frankreich/ }),
  ).not.toBeInTheDocument();
});

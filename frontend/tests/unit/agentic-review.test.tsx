/** Review diagnostics count actual package/page declarations and route work into the existing editors and preview. */
import { render, screen, fireEvent } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { LocaleScope } from "../../src/shared/i18n/i18n";
import AppDiagnostics from "../../src/admin/developer/AppDiagnostics";
import { template } from "../../src/admin/developer/app-model";
import DesignReview from "../../../extensions/apps/site-builder/studio/DesignReview";
import { newPage, newBlock } from "../../../extensions/apps/site-builder/model";
it("links incomplete declarations to editors and agent tests without asserting execution", () => {
  const nav = vi.fn(),
    assist = vi.fn();
  render(
    <LocaleScope locale="en-GB">
      <AppDiagnostics
        manifest={template()}
        onNavigate={nav}
        onAssist={assist}
      />
    </LocaleScope>,
  );
  expect(
    screen.getByText(/package declarations, not test results/),
  ).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: /Required settings/ }));
  expect(nav).toHaveBeenCalledWith("settings");
  fireEvent.click(screen.getByRole("button", { name: /Prepare a test plan/ }));
  expect(assist).toHaveBeenCalledWith(
    expect.stringContaining("denied, retry and rollback"),
  );
});
it("compares stable block identity, theme changes and real responsive preview entry", () => {
  const before = { ...newPage("default", "en-GB", "Home"), revision: 2 };
  before.content.blocks = [newBlock("text", "en-GB", "Old")];
  const after = {
    ...before,
    content: { blocks: [newBlock("form", "en-GB", "Contact")] },
    theme: { accent: "#ffffff" },
  };
  const preview = vi.fn();
  render(
    <LocaleScope locale="en-GB">
      <DesignReview before={before} after={after} onPreview={preview} />
    </LocaleScope>,
  );
  expect(
    screen.getByText("Elements removed").nextElementSibling,
  ).toHaveTextContent("1");
  expect(
    screen.getByText("Forms in proposal").nextElementSibling,
  ).toHaveTextContent("1");
  fireEvent.click(screen.getByRole("button", { name: "Preview mobile" }));
  expect(preview).toHaveBeenCalledWith("mobile");
  expect(screen.getByText(/do not certify/)).toBeVisible();
});

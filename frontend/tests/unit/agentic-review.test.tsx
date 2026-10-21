/** Review diagnostics count actual package/page declarations and route work into the existing editors and preview. */
import { render, screen, fireEvent } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { LocaleScope } from "../../src/shared/i18n/i18n";
import AppDiagnostics from "../../src/admin/developer/AppDiagnostics";
import { template } from "../../src/admin/developer/app-model";
import DesignReview from "../../../extensions/apps/site-builder/studio/DesignReview";
import { newPage, newBlock } from "../../../extensions/apps/site-builder/model";
import ProposalCard from "../../src/admin/assistant/ProposalCard";
it("shows every proposed work step for one explicit approval and never executes while rendering", () => {
  const approve = vi.fn();
  const message: any = {
    id: 1,
    role: "assistant",
    content: "Prepare the private catalogue",
    applied: false,
    data: {
      taskId: "task",
      preview: {
        catalogBefore: [],
        proposal: {
          summary: "Prepare",
          changes: [],
          operations: [
            {
              name: "merchant.product.create",
              label: "Create the coat",
              arguments_json: '{"product":{"id":"coat"}}',
            },
            {
              name: "automation.save",
              label: "Prepare the review flow",
              arguments_json: '{"id":"review"}',
            },
          ],
        },
      },
    },
  };
  render(
    <LocaleScope locale="en-GB">
      <ProposalCard message={message} onApply={approve} busy={false} canApply />
    </LocaleScope>,
  );
  expect(screen.getByText(/Create the coat/)).toBeVisible();
  expect(screen.getByText(/Prepare the review flow/)).toBeVisible();
  expect(approve).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: /approve/i }));
  expect(approve).toHaveBeenCalledTimes(1);
});
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
it("keeps actual read-only review blocked without mislabelling accepted or completed work", () => {
  const approve = vi.fn();
  const message: any = {
    id: 1,
    applied: false,
    data: {
      preview: {
        catalogBefore: [],
        proposal: {
          changes: [],
          operations: [
            {
              name: "merchant.category.create",
              label: "Create category",
              arguments_json: "{}",
            },
          ],
        },
      },
    },
  };
  const view = (applied = false, approvalStarted = false) => (
    <LocaleScope locale="en-GB">
      <ProposalCard
        message={{ ...message, applied }}
        onApply={approve}
        busy={false}
        canApply={false}
        approvalStarted={approvalStarted}
      />
    </LocaleScope>
  );
  const { rerender } = render(view());
  expect(screen.getByText(/read.only/i)).toBeVisible();
  expect(screen.getByRole("button", { name: /approve/i })).toBeDisabled();
  rerender(view(false, true));
  expect(screen.queryByText(/read.only/i)).toBeNull();
  expect(screen.queryByRole("button", { name: /approve/i })).toBeNull();
  rerender(view(true));
  expect(screen.queryByText(/read.only/i)).toBeNull();
  expect(screen.queryByRole("button", { name: /approve/i })).toBeNull();
  expect(approve).not.toHaveBeenCalled();
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

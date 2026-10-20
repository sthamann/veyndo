/** Language-to-grid handoffs retain native editable criteria; current work never leaks across request identities. */
import {
  renderHook,
  waitFor,
  render,
  screen,
  fireEvent,
} from "@testing-library/react";
import { it, expect, vi } from "vitest";
import {
  openReviewedView,
  consumePinnedView,
  clearPinnedView,
  safePinnedCriteria,
} from "../../src/shared/grid/pinned-view";
import { useGridPage } from "../../src/shared/grid/useGridPage";
import { LocaleScope } from "../../src/shared/i18n/i18n";
import ProposalCard from "../../src/admin/assistant/ProposalCard";
it("opens agent filters in the real server grid, allows manual editing and never persists personal criteria", async () => {
  history.replaceState(null, "", "?studio=orders");
  openReviewedView("orders", { customer: "Synthetic Alex", state: "open" });
  const request = vi.fn(async () => ({ elements: [], nextCursor: null }));
  const { result } = renderHook(() =>
    useGridPage(request, "/api/merchant/orders"),
  );
  await waitFor(() =>
    expect(request).toHaveBeenCalledWith(
      expect.stringContaining("customer=Synthetic+Alex"),
    ),
  );
  expect(result.current.criteria.state).toBe("open");
  result.current.onCriteria({ state: "completed" });
  await waitFor(() =>
    expect(result.current.criteria).toEqual({ state: "completed" }),
  );
  expect(
    safePinnedCriteria({ customer: "Synthetic Alex", state: "open" }),
  ).toEqual({ state: "open" });
  openReviewedView("orders", { tenant: "foreign" });
  expect(consumePinnedView("orders")).toBeUndefined();
  clearPinnedView();
});
it("requires a click to open the reviewed list and offers no commerce approval for a read-only view", () => {
  const open = vi.fn(),
    approve = vi.fn();
  const message: any = {
    data: {
      preview: {
        catalogBefore: [],
        proposal: {
          summary: "Show open orders",
          changes: [],
          view: { entity: "orders", criteria: { state: "open" } },
        },
      },
    },
  };
  render(
    <LocaleScope locale="en-GB">
      <ProposalCard
        message={message}
        busy={false}
        canApply
        onApply={approve}
        onOpenView={open}
      />
    </LocaleScope>,
  );
  expect(open).not.toHaveBeenCalled();
  expect(screen.queryByRole("button", { name: /approve/i })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Open editable list" }));
  expect(open).toHaveBeenCalledWith(message.data.preview.proposal.view);
  expect(approve).not.toHaveBeenCalled();
});

import SourceEditor from "../../src/admin/intelligence/SourceEditor";
it("creates guidance directly in the active enabled language without requiring an empty inherited main-language value", async () => {
  const request = vi.fn(async () => ({})),
    saved = vi.fn();
  render(
    <LocaleScope locale="de-DE">
      <SourceEditor
        workspace={
          {
            mainLocale: "en-GB",
            locales: ["en-GB", "de-DE"],
            canWrite: true,
          } as any
        }
        request={request}
        initialKind="guidance"
        onSaved={saved}
        onCancel={() => {}}
      />
    </LocaleScope>,
  );
  const title = screen.getByRole("textbox", { name: "Titel" }),
    content = screen.getByRole("textbox", { name: "Quellentext" });
  expect(title).not.toBeDisabled();
  fireEvent.change(title, { target: { value: "Unsere Vorgaben" } });
  fireEvent.change(content, {
    target: { value: "Sachlich und präzise schreiben." },
  });
  fireEvent.click(screen.getByRole("button", { name: "Quelle speichern" }));
  await waitFor(() => expect(saved).toHaveBeenCalled());
  expect(request).toHaveBeenCalledWith(
    "/api/knowledge/documents",
    expect.objectContaining({
      kind: "guidance",
      locale: "de-DE",
      title: "Unsere Vorgaben",
      content: "Sachlich und präzise schreiben.",
    }),
    "POST",
  );
});

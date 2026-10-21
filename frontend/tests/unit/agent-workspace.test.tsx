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
it("shows exactly the reviewed collection rather than claiming a whole-catalogue translation", () => {
  const apply = vi.fn();
  const message: any = {
    data: {
      taskId: "selected-translation",
      preview: {
        catalogBefore: [{ id: "mug", name: "Ceramic mug" }],
        proposal: {
          summary: "Translate the mug",
          changes: [],
          translation: "it-IT",
          translation_products: ["mug"],
        },
      },
    },
  };
  render(
    <LocaleScope locale="en-GB">
      <ProposalCard message={message} onApply={apply} busy={false} canApply />
    </LocaleScope>,
  );
  expect(
    screen.getByText(/only for these 1 selected products/),
  ).toBeInTheDocument();
  expect(screen.getByText("Ceramic mug")).toBeInTheDocument();
  expect(screen.queryByText(/for the entire catalogue/)).toBeNull();
  expect(apply).not.toHaveBeenCalled();
});

import AgentRunCard from "../../src/admin/shell/AgentRunCard";
it("opens linked drafts through the existing scoped Studio rather than a document reload", () => {
  const onTranslations = vi.fn();
  history.replaceState(null, "", "?shop=private-collection&lang=de-DE");
  render(
    <LocaleScope locale="de-DE">
      <AgentRunCard
        value={{
          taskId: "task-1",
          state: "queued",
          revision: 3,
          execution: {
            total: 2,
            completed: 1,
            steps: [
              {
                name: "merchant.translations.create",
                label: "Italienische Produkttexte",
                completed: false,
                translationJobId: "work-task-1-1",
              },
            ],
          },
        }}
        onTranslations={onTranslations}
        control={vi.fn()}
      />
    </LocaleScope>,
  );
  fireEvent.click(
    screen.getByRole("button", { name: "Übersetzungsentwürfe prüfen" }),
  );
  expect(onTranslations).toHaveBeenCalledWith("work-task-1-1");
  expect(location.search).toBe("?shop=private-collection&lang=de-DE");
  expect(screen.queryByText("Freigegebener Auftrag erledigt")).toBeNull();
});

import TranslationJobs from "../../src/admin/settings/TranslationJobs";
it("keeps linked translation lifecycle controls in the original task while retaining draft review", async () => {
  history.replaceState(null, "", "?translationJob=linked-job");
  const request = vi.fn(async (path: string) => {
    if (path === "/api/agent/providers") return { providers: [] };
    if (path === "/api/merchant/translations")
      return {
        jobs: [
          {
            id: "linked-job",
            run_task: "task-1",
            target_locale: "it-IT",
            status: "failed",
            total: 1,
            processed: 0,
          },
        ],
      };
    return { items: [], counts: {}, nextCursor: null };
  });
  render(
    <LocaleScope locale="en-GB">
      <TranslationJobs
        request={request as any}
        config={{ mainLocale: "es-ES", locales: ["es-ES", "it-IT"] } as any}
        disabled={false}
      />
    </LocaleScope>,
  );
  await screen.findByText(/Managed by an agent task/);
  expect(screen.queryByRole("button", { name: /resume|cancel/i })).toBeNull();
  expect(request.mock.calls.every((call) => call.length === 1)).toBe(true);
});

it("distinguishes an interrupted native operation from an uncertain model call and retains explicit continuation", async () => {
  const control = vi.fn(async () => {});
  const value = { taskId: "task-1", state: "uncertain" as const, revision: 4 };
  const { rerender } = render(
    <LocaleScope locale="de-DE">
      <AgentRunCard value={value} control={control} onTranslations={vi.fn()} />
    </LocaleScope>,
  );
  expect(
    screen.getByText("Modellaufruf unterbrochen · vor Fortsetzung prüfen"),
  ).toBeInTheDocument();
  rerender(
    <LocaleScope locale="de-DE">
      <AgentRunCard
        value={{
          ...value,
          execution: {
            completed: 1,
            total: 2,
            steps: [
              {
                name: "merchant.category.create",
                label: "Kategorie",
                completed: true,
              },
            ],
          },
        }}
        control={control}
        onTranslations={vi.fn()}
      />
    </LocaleScope>,
  );
  expect(screen.queryByText(/Modellaufruf/)).toBeNull();
  expect(
    screen.getByText("Aktion unterbrochen · vor Fortsetzung prüfen"),
  ).toBeInTheDocument();
  expect(screen.getByText("Abgeschlossene Aktionen: 1")).toBeInTheDocument();
  expect(control).not.toHaveBeenCalled();
  fireEvent.click(
    screen.getByRole("button", { name: "Gespeicherten Auftrag fortsetzen" }),
  );
  await waitFor(() => expect(control).toHaveBeenCalledWith("resume"));
});

import StudioConversation from "../../src/admin/shell/StudioConversation";
import { StudioContext } from "../../src/admin/shell/StudioContext";
it("labels a saved native execution error without mislabelling unrelated model failures", () => {
  const state = {
    t: (key: string) => key,
    providers: [],
    access: [],
    draft: "",
    locale: "de-DE",
    messages: [
      {
        id: 1,
        role: "assistant",
        content: "Invalid product metadata",
        data: { error: true, runId: "work-1" },
      },
    ],
    savedRun: {
      taskId: "work-1",
      state: "failed",
      revision: 3,
      execution: { completed: 1, total: 2, steps: [] },
    },
  } as any;
  const view = (value: any) => (
    <LocaleScope locale="de-DE">
      <StudioContext.Provider value={value}>
        <StudioConversation />
      </StudioContext.Provider>
    </LocaleScope>
  );
  const { rerender } = render(view(state));
  expect(
    screen.getByText(/Eine freigegebene Aktion wurde angehalten/),
  ).toBeInTheDocument();
  expect(screen.queryByText("errorReply")).toBeNull();
  rerender(
    view({ ...state, savedRun: { ...state.savedRun, taskId: "another-task" } }),
  );
  expect(screen.getByText("errorReply")).toBeInTheDocument();
});

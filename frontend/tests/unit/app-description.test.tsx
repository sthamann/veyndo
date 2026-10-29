/** Merchant descriptions begin an ordinary private draft and retain the shared reviewed agent flow. */
import {
  act,
  fireEvent,
  render,
  renderHook,
  screen,
} from "@testing-library/react";
import { expect, it, vi } from "vitest";
import AppAssistant from "../../src/admin/developer/AppAssistant";
import AppAgentPanel from "../../src/admin/developer/AppAgentPanel";
import { useAppAgentEntry } from "../../src/admin/developer/AppAgentDrawer";
import { ContentLanguage } from "../../src/shared/i18n/ContentLanguage";
import { LocaleProvider } from "../../src/shared/i18n/i18n";
it("starts from a merchant brief without inserting unrelated template fields or public authority", () => {
  const create = vi.fn();
  render(
    <LocaleProvider>
      <ContentLanguage locales={["en-GB", "de-DE"]} mainLocale="en-GB">
        <AppAssistant onCreate={create} onClose={() => {}} />
      </ContentLanguage>
    </LocaleProvider>,
  );
  fireEvent.change(screen.getByRole("textbox", { name: "App name" }), {
    target: { value: "Consultation requests" },
  });
  const next = screen.getByRole("button", { name: "Prepare with AI" });
  expect(next).toBeDisabled();
  const brief =
    "A private product consultation form with a design upload, review status and team setting.";
  fireEvent.change(
    screen.getByRole("textbox", { name: "What should your app do?" }),
    { target: { value: brief } },
  );
  fireEvent.click(next);
  expect(create).toHaveBeenCalledOnce();
  const [manifest, instruction] = create.mock.calls[0];
  expect(instruction).toBe(brief);
  expect(manifest.name["en-GB"]).toBe("Consultation requests");
  expect(manifest.runtime).toBe("declarative");
  expect(manifest.entities).toEqual([]);
  expect(manifest.actions).toEqual([]);
  expect(manifest.permissions).not.toContain("storefront.slot");
  expect(manifest.permissions).not.toContain("service.call");
});
it("carries a new app brief into complete-app mode and immediately fences a changed shop request", () => {
  const first = vi.fn(),
    second = vi.fn();
  const studio = {
    manifest: {
      id: "new_app",
      entities: [],
      views: [],
      surfaces: [],
      slots: [],
      actions: [],
      permissions: [],
    },
    env: "private_stage",
    providers: [{ id: "platform", configured: true }],
    run: vi.fn(),
  } as any;
  const hook = renderHook(({ request }) => useAppAgentEntry(studio, request), {
    initialProps: { request: first },
  });
  act(() =>
    hook.result.current.show("Our private consultation app", {
      app: "new_app",
      mode: "compose",
    }),
  );
  const seed = hook.result.current.drawer.requestSeed;
  render(
    <LocaleProvider>
      <AppAgentPanel studio={studio} request={first} requestSeed={seed} />
    </LocaleProvider>,
  );
  expect(
    screen.getByRole("textbox", { name: "What would you like to change?" }),
  ).toHaveValue("Our private consultation app");
  expect(
    screen.getByRole("combobox", { name: "What should change?" }),
  ).toHaveValue("compose");
  hook.rerender({ request: second });
  expect(hook.result.current.drawer.open).toBe(false);
  expect(hook.result.current.drawer.requestSeed).toBeUndefined();
});
it("creates a first private sandbox before opening a new merchant brief", async () => {
  const { startDescribedApp } =
    await import("../../src/admin/developer/start-described-app");
  const show = vi.fn(),
    ready = vi.fn(),
    startDraft = vi.fn();
  const studio = {
    env: "",
    mainLocale: "en-GB",
    createSandbox: vi.fn().mockResolvedValue("first_private"),
    startDraft,
    run: async (fn: () => Promise<void>) => fn(),
  } as any;
  const draft = { id: "brief_app", name: { "en-GB": "Consultation" } } as any;
  await startDescribedApp(
    studio,
    show,
    draft,
    "Our private app",
    ready,
    "App development",
  );
  expect(studio.createSandbox).toHaveBeenCalledWith("App development");
  expect(startDraft).toHaveBeenCalledWith(draft);
  expect(show).toHaveBeenCalledWith("Our private app", {
    app: "brief_app",
    mode: "compose",
    environment: "first_private",
  });
  expect(ready).toHaveBeenCalledOnce();
  studio.createSandbox.mockResolvedValue(undefined);
  show.mockClear();
  startDraft.mockClear();
  await startDescribedApp(
    studio,
    show,
    draft,
    "Cancelled by a changed account",
    ready,
    "App development",
  );
  expect(startDraft).not.toHaveBeenCalled();
  expect(show).not.toHaveBeenCalled();
});
it("keeps an explicitly created sandbox brief open but fences a later environment switch", () => {
  const request = vi.fn();
  const studio = { manifest: { id: "new_app" }, env: "" } as any;
  const hook = renderHook(
    ({ env }) => useAppAgentEntry({ ...studio, env }, request),
    { initialProps: { env: "" } },
  );
  act(() =>
    hook.result.current.show("Private app", {
      app: "new_app",
      mode: "compose",
      environment: "created_stage",
    }),
  );
  hook.rerender({ env: "created_stage" });
  expect(hook.result.current.drawer.open).toBe(true);
  expect(hook.result.current.drawer.requestSeed?.environment).toBe(
    "created_stage",
  );
  hook.rerender({ env: "other_stage" });
  expect(hook.result.current.drawer.open).toBe(false);
  expect(hook.result.current.drawer.requestSeed).toBeUndefined();
});
it.each(["Beratungsanfragen", "設計相談".repeat(30)])(
  "uses a bounded localized sandbox label independently of the selected app translation: %s",
  async (name) => {
    const { startDescribedApp } =
      await import("../../src/admin/developer/start-described-app");
    const studio = {
      env: "",
      mainLocale: "en-GB",
      createSandbox: vi.fn().mockResolvedValue("private_stage"),
      startDraft: vi.fn(),
      run: async (fn: () => Promise<void>) => fn(),
    } as any;
    const draft = { id: "translated_app", name: { "de-DE": name } } as any;
    await startDescribedApp(
      studio,
      vi.fn(),
      draft,
      "Private app",
      vi.fn(),
      "App-Entwicklung",
    );
    expect(studio.createSandbox).toHaveBeenCalledWith("App-Entwicklung");
    expect(studio.startDraft).toHaveBeenCalledWith(draft);
    expect(draft.name).toEqual({ "de-DE": name });
  },
);

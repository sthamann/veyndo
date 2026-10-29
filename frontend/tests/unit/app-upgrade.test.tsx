/** Package consent shows native upgrade admission and cannot activate a blocked proposal. */
import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import AppConsent from "../../src/admin/apps/AppConsent";
import { LocaleProvider } from "../../src/shared/i18n/i18n";
import AppUpgradeCheck from "../../src/admin/developer/AppUpgradeCheck";
it("blocks installation when the native data migration preflight fails", async () => {
  const install = vi.fn();
  const request = vi.fn().mockResolvedValue({
    app: "test",
    name: { "en-GB": "Test" },
    version: "1.1.0",
    digest: "abc",
    permissions: ["data.read"],
    added: [],
    previousVersion: "1.0.0",
    upgrade: {
      ready: false,
      migrationRequired: true,
      migrationSteps: 0,
      models: [{ name: "entries", records: 2 }],
      issue: { detail: "Migration integer conversion failed" },
    },
  });
  render(
    <LocaleProvider>
      <AppConsent
        app="test"
        request={request}
        onCancel={() => {}}
        onInstall={install}
      />
    </LocaleProvider>,
  );
  expect(await screen.findByRole("button", { name: "Upgrade" })).toBeDisabled();
  expect(screen.getByRole("alert")).toHaveTextContent(
    "Migration integer conversion failed",
  );
  expect(install).not.toHaveBeenCalled();
});
it("hides a ready consent immediately when the current account request changes", async () => {
  const review = {
    app: "test",
    name: { "en-GB": "Test" },
    version: "1.1.0",
    digest: "abc",
    permissions: [],
    added: [],
    previousVersion: "1.0.0",
    upgrade: {
      ready: true,
      migrationRequired: false,
      migrationSteps: 0,
      models: [],
      issue: null,
    },
  };
  const first = vi.fn().mockResolvedValue(review),
    second = vi.fn().mockReturnValue(new Promise(() => {}));
  const view = (request: any) => (
    <LocaleProvider>
      <AppConsent
        app="test"
        request={request}
        onCancel={() => {}}
        onInstall={vi.fn()}
      />
    </LocaleProvider>
  );
  const ui = render(view(first));
  expect(await screen.findByText("Ready for installation")).toBeVisible();
  ui.rerender(view(second));
  expect(screen.queryByText("Ready for installation")).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Install" })).toBeDisabled();
});
it("inspects only the selected immutable build and fences a changed stage", async () => {
  const request = vi.fn().mockResolvedValue({
    upgrade: {
      ready: true,
      migrationRequired: false,
      migrationSteps: 0,
      models: [],
      issue: null,
    },
  });
  const build = {
    environment: "stage_a",
    digest: "abc",
    manifest: { id: "test" },
  } as any;
  const install = vi.fn();
  const view = (b: any) => (
    <LocaleProvider>
      <AppUpgradeCheck
        build={b}
        request={request}
        disabled={false}
        install={{ label: "Install checked build", run: install }}
      />
    </LocaleProvider>
  );
  const ui = render(view(build));
  expect(
    screen.queryByRole("button", { name: "Install checked build" }),
  ).not.toBeInTheDocument();
  fireEvent.click(
    screen.getByRole("button", { name: "Check before installing" }),
  );
  expect(await screen.findByText("Ready for installation")).toBeVisible();
  fireEvent.click(
    screen.getByRole("button", { name: "Install checked build" }),
  );
  expect(install).toHaveBeenCalledOnce();
  expect(request).toHaveBeenCalledWith("/api/apps/review", {
    manifest: build.manifest,
    environment: "stage_a",
  });
  ui.rerender(view({ ...build, environment: "stage_b" }));
  expect(screen.queryByText("Ready for installation")).not.toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: "Install checked build" }),
  ).not.toBeInTheDocument();
});

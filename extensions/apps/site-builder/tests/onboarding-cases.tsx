/** New-shop setup uses real consent and private handoff, never a live edit or implicit installation. */
import {
  afterEach,
  render,
  screen,
  fireEvent,
  waitFor,
  expect,
  it,
  vi,
} from "../../../../frontend/tests/unit/package-test-support";
import { LocaleScope } from "../../../../frontend/src/shared/i18n/i18n";
import ShopDesigner from "../studio/ShopDesigner";
import type { RequestFn } from "../../../../frontend/src/shared/api/types";
afterEach(() => history.replaceState(null, "", "/"));
const rights = [
  "channels.manage",
  "apps.manage",
  "environments.read",
  "environments.manage",
  "assistant.use",
];
function api(installed: string[] = []) {
  return vi.fn(async (path: string, body?: any) => {
    if (path.includes("/context"))
      return {
        mainLocale: "en-GB",
        locales: ["en-GB"],
        installed: [...installed],
        channels: [{ id: "default", data: { name: { "en-GB": "Main" } } }],
        catalogue: { elements: [], hasMore: false, nextCursor: null },
      };
    if (path === "/api/environments")
      return body
        ? { id: "private-one" }
        : { environments: [{ id: "existing-private", name: "My campaign" }] };
    if (path === "/api/apps/review")
      return {
        app: body.builtIn,
        name: { "en-GB": body.builtIn },
        version: "1.0.0",
        digest: "a".repeat(64),
        permissions: ["admin.slot"],
        added: [],
        previousVersion: null,
      };
    if (path === "/api/apps") {
      installed.push(body.builtIn);
      return {};
    }
    return { elements: [] };
  });
}
function view(
  request: RequestFn,
  sandbox = false,
  access = rights,
  onSandbox = vi.fn(async () => {}),
) {
  return (
    <LocaleScope locale="en-GB">
      <ShopDesigner
        request={request}
        workspace={sandbox ? "private-one" : "live-one"}
        sandbox={sandbox}
        rights={access}
        onSandbox={onSandbox}
        onEnvironments={vi.fn()}
      />
    </LocaleScope>
  );
}
it("guides a new shop through private handoff and explicit package consents, then returns to the agent", async () => {
  const live = api(),
    enter = vi.fn(async () => {}),
    page = render(view(live, false, rights, enter));
  fireEvent.click(await screen.findByRole("tab", { name: "Agent" }));
  expect(
    screen.queryByRole("textbox", { name: "Reference URLs (one per line)" }),
  ).toBeNull();
  fireEvent.click(
    screen.getByRole("button", { name: "Create private draft and continue" }),
  );
  await waitFor(() => expect(enter).toHaveBeenCalledWith("private-one"));
  expect(live.mock.calls.some(([path]) => path === "/api/apps")).toBe(false);
  const privateRequest = api();
  page.rerender(view(privateRequest, true));
  fireEvent.click(
    await screen.findByRole("button", { name: "Review required apps" }),
  );
  fireEvent.click(await screen.findByRole("button", { name: "Install" }));
  await waitFor(() =>
    expect(
      privateRequest.mock.calls.filter(([path]) => path === "/api/apps"),
    ).toHaveLength(1),
  );
  await screen.findByText("site_forms · 1.0.0");
  fireEvent.click(await screen.findByRole("button", { name: "Install" }));
  await waitFor(() =>
    expect(
      screen.getByRole("textbox", { name: "Reference URLs (one per line)" }),
    ).toBeEnabled(),
  );
  expect(screen.getByRole("tab", { name: "Agent" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  expect(
    privateRequest.mock.calls
      .filter(([path]) => path === "/api/apps")
      .map(([, body]) => body.builtIn),
  ).toEqual(["site_builder", "site_forms"]);
  expect(
    privateRequest.mock.calls.some(([path]) => /save_page|release/.test(path)),
  ).toBe(false);
});
it("reuses a selected private workspace without creating another environment", async () => {
  const request = api(["site_builder", "site_forms"]),
    enter = vi.fn(async () => {});
  render(view(request, false, rights, enter));
  await screen.findByRole("option", { name: "My campaign" });
  fireEvent.change(
    await screen.findByRole("combobox", { name: "Private workspace" }),
    { target: { value: "existing-private" } },
  );
  fireEvent.click(
    screen.getByRole("button", { name: "Open selected sandbox" }),
  );
  await waitFor(() => expect(enter).toHaveBeenCalledWith("existing-private"));
  expect(
    request.mock.calls.some(
      ([path, body]) => path === "/api/environments" && body,
    ),
  ).toBe(false);
});
it("explains missing channel permission and never creates an environment for a read-only merchant", async () => {
  const request = api();
  render(view(request, false, ["channels.read", "environments.read"]));
  expect(
    await screen.findByText(
      /Ask a shop administrator for channel editing access/,
    ),
  ).toBeVisible();
  expect(
    screen.queryByRole("button", { name: "Create private draft and continue" }),
  ).toBeNull();
  expect(
    request.mock.calls.some(
      ([path, body]) => path === "/api/environments" && body,
    ),
  ).toBe(false);
});
it("cancels app consent without installing and retries a failed explicit install without creating another sandbox", async () => {
  const base = api();
  let fail = true;
  const request = vi.fn(async (path: string, body?: any) => {
    if (path === "/api/apps" && fail) {
      fail = false;
      throw new Error("Installation interrupted");
    }
    return base(path, body);
  });
  render(view(request, true));
  fireEvent.click(
    await screen.findByRole("button", { name: "Review required apps" }),
  );
  await screen.findByRole("button", { name: "Install" });
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  expect(base.mock.calls.some(([path]) => path === "/api/apps")).toBe(false);
  fireEvent.click(screen.getByRole("button", { name: "Review required apps" }));
  fireEvent.click(await screen.findByRole("button", { name: "Install" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Installation interrupted",
  );
  fireEvent.click(screen.getByRole("button", { name: "Install" }));
  await waitFor(() =>
    expect(
      base.mock.calls.some(
        ([path, body]) =>
          path === "/api/apps" && body.builtIn === "site_builder",
      ),
    ).toBe(true),
  );
  expect(
    base.mock.calls.some(
      ([path, body]) => path === "/api/environments" && body,
    ),
  ).toBe(false);
});
it("does not switch a different workspace when an old sandbox creation finishes late", async () => {
  const base = api(["site_builder", "site_forms"]),
    enter = vi.fn(async () => {});
  let finish!: (value: unknown) => void;
  const request = vi.fn(async (path: string, body?: any) =>
    path === "/api/environments" && body
      ? new Promise((resolve) => {
          finish = resolve;
        })
      : base(path, body),
  );
  const page = render(view(request, false, rights, enter));
  fireEvent.click(
    await screen.findByRole("button", {
      name: "Create private draft and continue",
    }),
  );
  await waitFor(() => expect(finish).toBeTypeOf("function"));
  page.rerender(view(api(), false, rights, enter));
  finish({ id: "old-private" });
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: "Create private draft and continue" }),
    ).toBeEnabled(),
  );
  expect(enter).not.toHaveBeenCalled();
});

/** Reviewing an editor draft must target the active sandbox, not the first unrelated environment. */
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { it, expect, vi } from "vitest";
import EnvironmentManager from "../../src/admin/environments/EnvironmentManager";
it("opens release review for the active editor sandbox", async () => {
  const request = vi.fn(async (path: string) =>
    path.endsWith("/diff") ? { changes: [] } : { releases: [] },
  );
  render(
    <EnvironmentManager
      request={request}
      environments={[
        { id: "unrelated", name: "Other work" },
        { id: "design", name: "Shop design" },
      ]}
      initialId="design"
      onRefresh={async () => {}}
      onSelect={() => {}}
      role="owner"
    />,
  );
  expect(screen.getByRole("combobox")).toHaveValue("design");
  await waitFor(() =>
    expect(request).toHaveBeenCalledWith("/api/environments/design/diff"),
  );
  expect(request).not.toHaveBeenCalledWith("/api/environments/unrelated/diff");
});

it("labels product releases in the shop main language when the interface translation is absent", async () => {
  const request = vi.fn(async (path: string) =>
    path.endsWith("/diff")
      ? {
          mainLocale: "it-IT",
          changes: [
            {
              key: "product:chair",
              before: null,
              after: {
                name: { "it-IT": "Poltrona", "en-GB": "Wrong fallback" },
              },
              digest: "reviewed",
              conflict: false,
            },
          ],
        }
      : { releases: [] },
  );
  render(
    <EnvironmentManager
      request={request}
      environments={[{ id: "draft", name: "Draft" }]}
      onRefresh={async () => {}}
      onSelect={() => {}}
      role="owner"
    />,
  );
  expect(
    await screen.findByRole("checkbox", { name: "Poltrona" }),
  ).toBeEnabled();
  expect(screen.queryByText("Wrong fallback")).not.toBeInTheDocument();
});

it("clears selected changes immediately when another sandbox is selected", async () => {
  let resolve!: (value: unknown) => void;
  const request = vi.fn(async (path: string) => {
    if (path.includes("/first/diff"))
      return {
        changes: [
          {
            key: "theme:first",
            before: {},
            after: {},
            digest: "first-revision",
            conflict: false,
          },
        ],
      };
    if (path.includes("/second/diff"))
      return new Promise((r) => {
        resolve = r;
      });
    return { releases: [] };
  });
  render(
    <EnvironmentManager
      request={request}
      environments={[
        { id: "first", name: "First" },
        { id: "second", name: "Second" },
      ]}
      onRefresh={async () => {}}
      onSelect={() => {}}
      role="owner"
    />,
  );
  const selected = await screen.findByRole("checkbox", { name: "theme:first" });
  fireEvent.click(selected);
  fireEvent.change(screen.getByRole("combobox"), {
    target: { value: "second" },
  });
  expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: /· 0$/ })).toBeDisabled();
  await act(async () =>
    resolve({
      changes: [
        {
          key: "theme:second",
          before: {},
          after: {},
          digest: "second-revision",
          conflict: false,
        },
      ],
    }),
  );
  expect(
    await screen.findByRole("checkbox", { name: "theme:second" }),
  ).not.toBeChecked();
  expect(request.mock.calls.some(([path]) => path.endsWith("/release"))).toBe(
    false,
  );
});

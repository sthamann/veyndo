/** Frozen export setup and source evidence remain visible and separately reviewed in the native workflow. */
import Connection from "../studio/Connection";
import { LocaleProvider } from "../../../../frontend/src/shared/i18n/i18n";
export function exportTests(deps: any, mount: any) {
  const { render, screen, fireEvent, waitFor, expect, it, vi } = deps;
  it("saves a separately authenticated pinned export without exposing or reusing API credentials", async () => {
    const request = vi.fn(async (_path: string, body?: unknown) =>
      body
        ? { revision: 2 }
        : {
            revision: 1,
            digest: "package",
            canManage: true,
            encryptionReady: true,
            values: { origin: "https://old.example", version: "wc/v3" },
          },
    );
    render(
      <LocaleProvider>
        <Connection request={request} />
      </LocaleProvider>,
    );
    const mode = await screen.findByLabelText("Read a frozen source export");
    await waitFor(() => expect(mode).toBeEnabled());
    fireEvent.click(mode);
    fireEvent.change(screen.getByLabelText("Export manifest URL"), {
      target: { value: "https://exports.example/manifest.json" },
    });
    fireEvent.change(screen.getByLabelText("Export manifest SHA-256"), {
      target: { value: "a".repeat(64) },
    });
    fireEvent.change(screen.getByLabelText("Export read credential"), {
      target: { value: "export-secret" },
    });
    fireEvent.submit(
      screen
        .getByRole("button", { name: "Save encrypted connection" })
        .closest("form"),
    );
    await waitFor(() =>
      expect(request).toHaveBeenCalledWith(
        "/api/apps/migration/settings",
        expect.objectContaining({
          values: expect.objectContaining({
            export_manifest: "https://exports.example/manifest.json",
            export_digest: "a".repeat(64),
            export_token: "export-secret",
          }),
        }),
        "PUT",
      ),
    );
    await waitFor(() =>
      expect(screen.getByLabelText("Export read credential")).toHaveValue(""),
    );
    expect(request.mock.calls.at(-1)[1].values).not.toHaveProperty("token");
  });
  it("shows frozen domain counts and digest without claiming whole-shop cutover", async () => {
    const request = vi.fn(async (path: string) => {
      if (path === "/api/apps")
        return { packages: [{ id: "migration", active: true, revision: 1 }] };
      if (path.endsWith("/jobs")) return { jobs: [] };
      return {
        sourceVersion: "wc/v3",
        kind: "products",
        sourceId: "installed",
        sourceExport: {
          digest: "a".repeat(64),
          sourceRecords: 125,
          normalizedRecords: 126,
          pages: 3,
          page: 1,
          scope: "domain-export",
        },
        recordDigests: ["b".repeat(64)],
        records: [
          {
            sourceId: "7",
            kind: "products",
            warnings: [],
            data: { name: { "en-GB": "Frozen cup" } },
          },
        ],
      };
    });
    mount(request, ["apps.read", "apps.manage", "catalog.read"]);
    fireEvent.click(
      await screen.findByRole("button", { name: "Inspect source page" }),
    );
    expect(await screen.findByText("Frozen source export")).toBeVisible();
    expect(
      screen.getByText("125 source records · 126 normalized records · 3 pages"),
    ).toBeVisible();
    expect(screen.getByText("a".repeat(64))).toBeVisible();
    expect(
      screen.getByText(/does not establish a consistent whole-shop snapshot/),
    ).toBeVisible();
  });
}

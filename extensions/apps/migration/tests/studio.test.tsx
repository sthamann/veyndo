/** Real migration workflow controls require readable source data and explicit import review. */
import { priceBasisTests } from "./price_basis.test";
import { crmTests } from "./crm.test";
import { inspectionTests } from "./inspection.test";
import { feedbackTests } from "./feedback.test";
import MigrationWorkspace from "../studio/MigrationWorkspace";
import { LocaleProvider } from "../../../../frontend/src/shared/i18n/i18n";
export function migrationStudioTests(deps: any) {
  const { render, screen, fireEvent, waitFor, expect, it, vi } = deps;
  function mount(request: any, rights: string[], onDesign?: any) {
    return render(
      <LocaleProvider>
        <MigrationWorkspace
          request={request}
          workspace="live"
          rights={rights}
          mainLocale="en-GB"
          onBack={() => {}}
          onDesign={onDesign}
        />
      </LocaleProvider>,
    );
  }
  feedbackTests(deps, mount);
  inspectionTests(deps, mount);
  priceBasisTests(deps, mount);
  crmTests(deps, mount);
  it("does not read installed apps without current app access", () => {
    const request = vi.fn();
    mount(request, []);
    expect(request).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent("You need access");
  });
  it("requires review, explicit tax and current write rights before queueing a private import", async () => {
    const request = vi.fn(async (path: string) => {
      if (path === "/api/apps")
        return { packages: [{ id: "migration", active: true, revision: 1 }] };
      if (path.endsWith("/jobs")) return { jobs: [] };
      if (path.endsWith("/review_products"))
        return {
          sourceVersion: "wc/v3",
          kind: "products",
          recordDigests: ["a".repeat(64)],
          records: [
            {
              sourceId: "9",
              kind: "products",
              warnings: [],
              data: {
                name: { "en-GB": "Source cup" },
                price: { minor: 1990, scale: 2, currency: "EUR" },
              },
            },
          ],
        };
      if (path === "/api/environments") return { id: "private-stage" };
      return { jobId: "job-1" };
    });
    mount(request, [
      "apps.read",
      "apps.manage",
      "catalog.read",
      "catalog.write",
      "environments.manage",
    ]);
    fireEvent.click(
      await screen.findByRole("button", { name: "Inspect source page" }),
    );
    expect(await screen.findByText("Source cup")).toBeVisible();
    const start = screen.getByRole("button", { name: "Import reviewed page" });
    expect(start).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Source price basis"), {
      target: { value: "gross" },
    });
    fireEvent.change(
      screen.getByLabelText("Reviewed destination tax rate (%)"),
      { target: { value: "19" } },
    );
    fireEvent.click(screen.getByRole("checkbox"));
    expect(start).toBeEnabled();
    fireEvent.click(start);
    await waitFor(() =>
      expect(request).toHaveBeenCalledWith(
        "/api/apps/migration/actions/import_products",
        expect.objectContaining({
          target: "private-stage",
          recordDigests: ["a".repeat(64)],
        }),
        "POST",
        expect.objectContaining({ idempotencyKey: expect.any(String) }),
      ),
    );
  });
  it("keeps personal source data unavailable without separate PII consent", async () => {
    const request = vi.fn().mockResolvedValue({
      packages: [{ id: "migration", active: true }],
      jobs: [],
    });
    mount(request, [
      "apps.read",
      "apps.manage",
      "catalog.read",
      "customers.read",
    ]);
    expect(
      await screen.findByRole("button", { name: "Customers & addresses" }),
    ).toBeDisabled();
  });

  it("reuses the saved target and source domain when continuing another page after reload", async () => {
    const result = {
      target: "saved-preview",
      kind: "products",
      sourceId: "installed",
      nextCursor: "page:2",
      imported: 50,
      reviewed: 50,
    };
    const request = vi.fn(async (path: string) => {
      if (path === "/api/apps")
        return { packages: [{ id: "migration", active: true, revision: 1 }] };
      if (path.endsWith("/jobs"))
        return {
          jobs: [
            {
              id: "queued-images",
              action: "import_assets",
              status: "queued",
              progress: 0,
              revision: 1,
              message: {},
            },
            {
              id: "done",
              status: "succeeded",
              progress: 100,
              message: {},
              result,
            },
          ],
        };
      if (path.endsWith("/review_products"))
        return {
          sourceVersion: "wc/v3",
          kind: "products",
          recordDigests: ["b".repeat(64)],
          records: [
            {
              sourceId: "next",
              kind: "products",
              warnings: [],
              data: { name: { "en-GB": "Next cup" } },
            },
          ],
        };
      return { jobId: "next-job" };
    });
    mount(request, [
      "apps.read",
      "apps.manage",
      "catalog.read",
      "catalog.write",
      "environments.manage",
    ]);
    expect(await screen.findByText("Products · Page reconciled")).toBeVisible();
    expect(screen.getByText("Product images · Queued")).toBeVisible();
    fireEvent.click(
      await screen.findByRole("button", { name: "Review next source page" }),
    );
    expect(await screen.findByText("Next cup")).toBeVisible();
    fireEvent.change(screen.getByLabelText("Source price basis"), {
      target: { value: "gross" },
    });
    fireEvent.change(
      screen.getByLabelText("Reviewed destination tax rate (%)"),
      { target: { value: "19" } },
    );
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(
      screen.getByRole("button", { name: "Import reviewed page" }),
    );
    await waitFor(() =>
      expect(request).toHaveBeenCalledWith(
        "/api/apps/migration/actions/import_products",
        expect.objectContaining({ target: "saved-preview", cursor: "page:2" }),
        "POST",
        expect.anything(),
      ),
    );
    expect(
      request.mock.calls.some(
        ([path]: [string]) => path === "/api/environments",
      ),
    ).toBe(false);
  });

  it("uses the same selected native preview for categories without requiring product tax", async () => {
    const request = vi.fn(async (path: string) => {
      if (path === "/api/apps")
        return { packages: [{ id: "migration", active: true, revision: 1 }] };
      if (path.endsWith("/jobs")) return { jobs: [] };
      if (path === "/api/environments")
        return {
          environments: [{ id: "existing-private", name: "Source preview" }],
        };
      if (path.endsWith("/review_categories"))
        return {
          sourceVersion: "wc/v3",
          kind: "categories",
          recordDigests: ["c".repeat(64)],
          records: [
            {
              sourceId: "cat",
              kind: "categories",
              warnings: [],
              data: { title: { "en-GB": "Ceramics" } },
            },
          ],
        };
      return { jobId: "categories-job" };
    });
    mount(request, [
      "apps.read",
      "apps.manage",
      "catalog.read",
      "catalog.write",
      "environments.manage",
      "environments.read",
    ]);
    fireEvent.click(
      await screen.findByRole("button", { name: "Categories & hierarchy" }),
    );
    await screen.findByRole("option", { name: "Source preview" });
    fireEvent.change(screen.getByLabelText(/Private import destination/), {
      target: { value: "existing-private" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Inspect source page" }),
    );
    expect(await screen.findByText("Ceramics")).toBeVisible();
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(
      screen.getByRole("button", { name: "Import reviewed page" }),
    );
    await waitFor(() =>
      expect(request).toHaveBeenCalledWith(
        "/api/apps/migration/actions/import_categories",
        expect.objectContaining({ target: "existing-private", options: {} }),
        "POST",
        expect.anything(),
      ),
    );
  });
  it("hands the selected private target and reviewed reference URL to the native design agent", async () => {
    const request = vi.fn(async (path: string) => {
      if (path === "/api/apps")
        return { packages: [{ id: "migration", active: true }] };
      if (path.endsWith("/jobs")) return { jobs: [] };
      if (path === "/api/environments")
        return {
          environments: [{ id: "preview-design", name: "Design preview" }],
        };
      if (path.endsWith("/review_products"))
        return {
          sourceVersion: "wc/v3",
          kind: "products",
          recordDigests: [],
          records: [
            {
              sourceId: "1",
              sourceShop: "https://source.example",
              kind: "products",
              warnings: [],
              data: { name: { "en-GB": "Cup" } },
            },
          ],
        };
      throw new Error("Unexpected write: " + path);
    });
    const onDesign = vi
      .fn()
      .mockRejectedValue(new Error("Design navigation failed"));
    mount(
      request,
      [
        "apps.read",
        "apps.manage",
        "catalog.read",
        "channels.manage",
        "environments.read",
        "environments.manage",
      ],
      onDesign,
    );
    await screen.findByRole("option", { name: "Design preview" });
    fireEvent.change(screen.getByLabelText(/Private import destination/), {
      target: { value: "preview-design" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Inspect source page" }),
    );
    await screen.findByText("Cup");
    fireEvent.click(screen.getByRole("button", { name: /design/i }));
    await waitFor(() =>
      expect(onDesign).toHaveBeenCalledWith(
        "preview-design",
        "https://source.example",
      ),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Design navigation failed",
    );
    expect(
      request.mock.calls.some(
        ([path, body]: [string, any]) => path === "/api/environments" && body,
      ),
    ).toBe(false);
  });
  it("reviews frozen image records and queues them into the same private target without a fabricated product tax", async () => {
    const request = vi.fn(async (path: string) => {
      if (path === "/api/apps")
        return { packages: [{ id: "migration", active: true }] };
      if (path.endsWith("/jobs")) return { jobs: [] };
      if (path === "/api/environments")
        return {
          environments: [{ id: "pictures-preview", name: "Pictures preview" }],
        };
      if (path.endsWith("/review_assets"))
        return {
          sourceVersion: "wc/v3",
          kind: "assets",
          records: [
            {
              sourceId: "image:1",
              kind: "assets",
              warnings: [],
              data: {
                title: { "en-GB": "Original cup" },
                url: "https://source.example/cup.png",
                byteLength: 68,
              },
            },
          ],
          recordDigests: ["d".repeat(64)],
        };
      return { jobId: "picture-import" };
    });
    mount(request, [
      "apps.read",
      "apps.manage",
      "catalog.read",
      "catalog.write",
      "environments.read",
      "environments.manage",
    ]);
    fireEvent.click(
      await screen.findByRole("button", { name: "Product images" }),
    );
    await screen.findByRole("option", { name: "Pictures preview" });
    fireEvent.change(screen.getByLabelText(/Private import destination/), {
      target: { value: "pictures-preview" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Inspect source page" }),
    );
    expect(
      await screen.findByRole("img", { name: "Original cup" }),
    ).toHaveAttribute("referrerpolicy", "no-referrer");
    fireEvent.error(screen.getByRole("img", { name: "Original cup" }));
    expect(screen.getByText("Preview unavailable")).toBeVisible();
    expect(screen.queryByRole("img", { name: "Original cup" })).toBeNull();
    expect(
      screen.queryByLabelText("Reviewed destination tax rate (%)"),
    ).toBeNull();
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(
      screen.getByRole("button", { name: "Import reviewed page" }),
    );
    await waitFor(() =>
      expect(request).toHaveBeenCalledWith(
        "/api/apps/migration/actions/import_assets",
        expect.objectContaining({
          kind: "assets",
          target: "pictures-preview",
          options: {},
        }),
        "POST",
        expect.anything(),
      ),
    );
  });
}

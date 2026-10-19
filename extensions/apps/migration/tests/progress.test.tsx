/** Connected-run regressions cover actual native-record consumption and delayed authorization changes. */
import { LocaleProvider } from "../../../../frontend/src/shared/i18n/i18n";
import { nextPage, readBatch, savePage, type Batch } from "../studio/run-pages";
import useRunPages from "../studio/useRunPages";
import RunProgress from "../studio/RunProgress";
import useMigrationImport from "../studio/useMigrationImport";
const labels = { empty: "empty", start: "start" };
const plan = {
  id: "run-1",
  revision: 1,
  title: { "en-GB": "Summer" },
  source_id: "installed",
  target: "private",
  domains: ["products", "categories", "assets"] as any,
};
const batch = (kind: string, cursor = "", next = ""): Batch => ({
  id: kind + cursor,
  revision: 2,
  run_id: plan.id,
  source_id: plan.source_id,
  kind: kind as any,
  target: "private",
  cursor,
  next_cursor: next,
  digests: ["a".repeat(64)],
  options: {},
  state: "matching",
  verified: true,
  result: {
    kind: kind as any,
    sourceId: "installed",
    reconciled: true,
    comparison: {
      matching: 1,
      checked: 1,
      changed: 0,
      missing: 0,
      checkedAt: "2026-10-19T09:00:00Z",
    },
  },
});
export function migrationProgressTests({
  render,
  screen,
  fireEvent,
  waitFor,
  expect,
  it,
  vi,
  webcrypto,
}: any) {
  it("walks real dependency and cursor order and never completes from a missing or mismatched page", () => {
    expect(
      nextPage(plan, [{ ...batch("categories"), verified: false }]).completed,
    ).toBe(0);
    expect(nextPage(plan, []).kind).toBe("categories");
    expect(nextPage(plan, [batch("categories")]).kind).toBe("products");
    expect(
      nextPage(plan, [batch("categories"), batch("products", "", "page2")]),
    ).toMatchObject({ kind: "products", cursor: "page2", completed: 1 });
    const pages = [
      batch("categories"),
      batch("products", "", "page2"),
      batch("products", "page2"),
      batch("assets"),
    ];
    expect(nextPage(plan, pages)).toEqual({ completed: 3 });
    pages[2].result!.comparison!.matching = 0;
    expect(nextPage(plan, pages).kind).toBe("products");
    expect(readBatch({ ...pages[0], kind: "unregistered" })).toBeUndefined();
  });
  it("does not follow cycles, count foreign receipts or claim completion from a truncated list", () => {
    const p = { ...plan, domains: ["products"] as any };
    expect(
      nextPage(p, [{ ...batch("products"), run_id: "foreign" }]).completed,
    ).toBe(0);
    expect(
      nextPage(p, [
        batch("products", "", "second"),
        batch("products", "second", "second"),
      ]).blocked,
    ).toBe(true);
    render(
      <LocaleProvider>
        <RunProgress
          plan={p}
          pages={[batch("products")]}
          hasMore={true}
          loadMore={vi.fn()}
          busy={false}
          active={false}
          onNext={vi.fn()}
          onRun={vi.fn()}
        />
      </LocaleProvider>,
    );
    expect(
      screen.getByRole("button", { name: /load more saved pages/i }),
    ).toBeVisible();
    expect(
      screen.queryByText(/all selected areas have been checked/i),
    ).toBeNull();
  });
  it("reopens source review for unverified records instead of retrying forged frozen hashes", () => {
    const onNext = vi.fn(),
      onRun = vi.fn();
    render(
      <LocaleProvider>
        <RunProgress
          plan={{ ...plan, domains: ["products"] as any }}
          pages={[{ ...batch("products"), verified: false }]}
          hasMore={false}
          loadMore={vi.fn()}
          busy={false}
          active={false}
          onNext={onNext}
          onRun={onRun}
        />
      </LocaleProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: /review next page/i }));
    expect(onNext).toHaveBeenCalledWith("products", undefined);
    expect(onRun).not.toHaveBeenCalled();
    expect(
      screen.getByRole("button", { name: /review source page again/i }),
    ).toBeVisible();
  });
  it("loads saved current page evidence after technical jobs were archived and remounts without new writes", async () => {
    const request = vi.fn(async (path: string) =>
      path.endsWith("job_evidence")
        ? { verified: [{ id: "categories", revision: 2 }] }
        : { elements: [batch("categories")] },
    );
    function View() {
      const value = useRunPages(request, plan.id, "apps.manage", true, vi.fn());
      return <span>{value.pages.length}</span>;
    }
    const view = render(<View />);
    await screen.findByText("1");
    view.unmount();
    render(<View />);
    await screen.findByText("1");
    expect(
      request.mock.calls.every(([path]: any) =>
        [
          "/api/apps/migration/actions/list_batches",
          "/api/apps/migration/core/job_evidence",
        ].includes(path),
      ),
    ).toBe(true);
  });
  it("drops late record pages after rights revocation", async () => {
    let resolve: any;
    const request = vi.fn(
      () =>
        new Promise((r) => {
          resolve = r;
        }),
    );
    function View({ enabled, access }: { enabled: boolean; access: string }) {
      const v = useRunPages(request, plan.id, access, enabled, vi.fn());
      return <span>{v.pages.map((b) => b.id).join(",") || labels.empty}</span>;
    }
    const view = render(<View enabled={true} access="apps.manage" />);
    await waitFor(() => expect(resolve).toBeTypeOf("function"));
    view.rerender(<View enabled={false} access="apps.read" />);
    resolve({ elements: [batch("categories")] });
    await waitFor(() => expect(screen.getByText("empty")).toBeVisible());
    expect(screen.queryByText("categories")).toBeNull();
  });
  it("saves exact page options/digests with native CAS before queuing and stops after a late rights change", async () => {
    vi.stubGlobal("crypto", webcrypto);
    try {
      let resolve: any;
      const request = vi.fn((path: string) =>
        path.endsWith("list_batches")
          ? new Promise((r) => {
              resolve = r;
            })
          : Promise.resolve({ revision: 1 }),
      );
      const review = {
        records: [{ warnings: [] }],
        recordDigests: ["a".repeat(64)],
      };
      function View({ access }: { access: string }) {
        const { start } = useMigrationImport({
          request,
          workspace: "live",
          accessKey: access,
          kind: "products",
          sourceId: "installed",
          mainLocale: "en-GB",
          review: review as any,
          plan,
          target: "private",
          tax: "19",
          sourcePriceBasis: "gross",
          group: "",
          canImport: true,
          approved: true,
          name: "Preview",
          setBusy: vi.fn(),
          setError: vi.fn(),
          setTarget: vi.fn(),
          setPlan: vi.fn(),
          setApproved: vi.fn(),
          refresh: vi.fn(),
        });
        return <button onClick={() => void start()}>{labels.start}</button>;
      }
      const view = render(
        <View access="apps.manage|catalog.read|catalog.write|environments.manage" />,
      );
      fireEvent.click(screen.getByRole("button", { name: "start" }));
      await waitFor(() => expect(resolve).toBeTypeOf("function"));
      view.rerender(<View access="apps.read" />);
      resolve({ elements: [] });
      await new Promise((r) => setTimeout(r, 0));
      expect(
        request.mock.calls.some(([path]: any) => path.endsWith("save_batch")),
      ).toBe(false);
      expect(
        request.mock.calls.some(([path]: any) =>
          path.endsWith("import_products"),
        ),
      ).toBe(false);
    } finally {
      vi.unstubAllGlobals();
    }
  });
  it("stores a deterministic page identity and uses an existing receipt revision", async () => {
    vi.stubGlobal("crypto", webcrypto);
    try {
      const request = vi.fn(async (path: string, input: any) =>
        path.endsWith("list_batches")
          ? { elements: [{ ...batch("products"), id: input.id }] }
          : { revision: 3 },
      );
      const result = await savePage(
        request,
        plan,
        "products",
        "private",
        undefined,
        ["a".repeat(64)],
        { taxRate: 19 },
      );
      expect(result?.batchRevision).toBe(3);
      expect(result?.batchId).toMatch(/^[a-f0-9]{64}$/);
      expect(request).toHaveBeenLastCalledWith(
        "/api/apps/migration/actions/save_batch",
        expect.objectContaining({ revision: 2 }),
      );
    } finally {
      vi.unstubAllGlobals();
    }
  });
}

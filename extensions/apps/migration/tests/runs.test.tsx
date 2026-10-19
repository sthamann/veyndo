/** Saved migration plans restore only context; they never approve source pages or assert whole-shop completion. */
import { LocaleProvider } from "../../../../frontend/src/shared/i18n/i18n";
import RunPlans from "../studio/RunPlans";
import { readRunPlan } from "../studio/run-model";
import useJobPages from "../studio/useJobPages";
import { useRunText } from "../studio/run-i18n";
import Jobs from "../studio/Jobs";
export function migrationRunTests({
  render,
  screen,
  fireEvent,
  waitFor,
  expect,
  it,
  vi,
}: any) {
  it("reopens a native saved plan after remount without approving or starting any import", async () => {
    const select = vi.fn(),
      request = vi.fn(async () => ({
        elements: [
          {
            id: "run-1",
            revision: 1,
            title: { "en-GB": "Summer collection" },
            source_id: "frozen",
            target: "private-preview",
            domains: ["products", "assets"],
          },
        ],
      }));
    const view = () => (
      <LocaleProvider>
        <RunPlans
          request={request}
          mainLocale="en-GB"
          sourceId="installed"
          target={undefined}
          busy={false}
          onSelect={select}
          onError={vi.fn()}
        />
      </LocaleProvider>
    );
    const first = render(view());
    fireEvent.click(
      await screen.findByRole("button", { name: "Summer collection" }),
    );
    expect(select).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "run-1",
        source_id: "frozen",
        target: "private-preview",
      }),
    );
    first.unmount();
    render(view());
    expect(
      await screen.findByRole("button", { name: "Summer collection" }),
    ).toBeVisible();
    expect(
      request.mock.calls.every(
        ([path]: [string]) => path === "/api/apps/migration/actions/list_runs",
      ),
    ).toBe(true);
    expect(screen.getByText(/not a completed shop migration/i)).toBeVisible();
  });
  it("rejects malformed stored work-plan domains before they can select a source action", () => {
    const base = {
      id: "saved",
      revision: 1,
      title: { "en-GB": "Saved" },
      source_id: "installed",
    };
    for (const domains of [
      "products",
      [],
      ["products", "unknown"],
      [1],
      ["products", "products"],
    ])
      expect(readRunPlan({ ...base, domains })).toBeUndefined();
    expect(
      readRunPlan({ ...base, domains: ["products", "assets"] }),
    ).toBeDefined();
  });
  it("loads older native pages for the selected run and clears history on access changes", async () => {
    const request = vi.fn(async (path: string) =>
      path.includes("after=")
        ? { jobs: [{ id: "older", status: "succeeded" }], hasMore: false }
        : {
            jobs: [{ id: "latest", status: "succeeded" }],
            hasMore: true,
            nextCursor: "cursor-1",
          },
    );
    function Probe({ scope }: { scope: string }) {
      const t = useRunText();
      const { jobs, hasMore, more } = useJobPages(
        request,
        true,
        "run-1",
        vi.fn(),
        scope,
      );
      return (
        <>
          <span>{jobs.map((j) => j.id).join(",")}</span>
          {hasMore && <button onClick={more}>{t("more")}</button>}
        </>
      );
    }
    const view = render(
      <LocaleProvider>
        <Probe scope="pii" />
      </LocaleProvider>,
    );
    await screen.findByText("latest");
    fireEvent.click(screen.getByRole("button", { name: "Load older jobs" }));
    await screen.findByText("latest,older");
    expect(request).toHaveBeenCalledWith(
      "/api/apps/migration/jobs?limit=100&group=run-1&after=cursor-1",
    );
    let resolve: (value: any) => void = () => {};
    request.mockImplementation(
      () =>
        new Promise((r) => {
          resolve = r;
        }),
    );
    view.rerender(
      <LocaleProvider>
        <Probe scope="no-pii" />
      </LocaleProvider>,
    );
    await waitFor(() => expect(screen.queryByText("latest,older")).toBeNull());
    resolve({ jobs: [], hasMore: false });
  });
  it("discards a delayed job-control refresh after the same user's PII rights change", async () => {
    const failed = {
      id: "failed-personal",
      action: "review_customers",
      status: "failed",
      progress: 0,
      revision: 1,
      message: {},
    };
    let reads = 0,
      resolveOld: (value: any) => void = () => {};
    const request = vi.fn(async (_path: string, body?: unknown) => {
      if (body) return { accepted: true };
      reads++;
      if (reads === 1) return { jobs: [failed] };
      if (reads === 2)
        return new Promise((resolve) => {
          resolveOld = resolve;
        });
      return { jobs: [] };
    });
    function Probe({ scope }: { scope: string }) {
      const { jobs, refresh } = useJobPages(
        request,
        true,
        "run-1",
        vi.fn(),
        scope,
      );
      return (
        <LocaleProvider>
          <Jobs
            request={request}
            jobs={jobs}
            manage={true}
            busy={false}
            onBusy={vi.fn()}
            onError={vi.fn()}
            onRefresh={refresh}
            onNext={vi.fn()}
            onReview={vi.fn()}
          />
        </LocaleProvider>
      );
    }
    const view = render(<Probe scope="with-pii" />);
    fireEvent.click(
      await screen.findByRole("button", {
        name: "I checked the outcome: resume safely",
      }),
    );
    await waitFor(() => expect(reads).toBe(2));
    view.rerender(<Probe scope="without-pii" />);
    await waitFor(() => expect(reads).toBe(3));
    resolveOld({
      jobs: [
        {
          ...failed,
          status: "succeeded",
          result: {
            kind: "customers",
            sourceId: "source",
            records: [{ data: { email: "private@example.test" } }],
          },
        },
      ],
    });
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(
      screen.queryByRole("button", { name: "Open source review" }),
    ).toBeNull();
    expect(
      request.mock.calls.filter(([path]: [string]) => path.includes("/jobs?"))
        .length,
    ).toBe(3);
  });
}

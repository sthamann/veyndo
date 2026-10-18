/** Durable inspection results reopen after reload and remain explicit, unapproved source evidence. */
export function inspectionTests(deps: any, mount: any) {
  const { screen, fireEvent, expect, it, vi } = deps;
  const review = {
    kind: "products",
    sourceId: "installed",
    cursor: "slice:9",
    sourceVersion: "wc/v3",
    adapterVersion: 1,
    records: [
      {
        sourceId: "9",
        kind: "products",
        warnings: [],
        data: { name: { "en-GB": "Durable source cup" } },
      },
    ],
    recordDigests: ["a".repeat(64)],
  };
  const rights = [
    "apps.read",
    "apps.manage",
    "catalog.read",
    "catalog.write",
    "environments.manage",
  ];
  const makeRequest = () =>
    vi.fn(async (path: string) => {
      if (path === "/api/apps")
        return { packages: [{ id: "migration", active: true }] };
      if (path.endsWith("/jobs"))
        return {
          jobs: [
            {
              id: "inspection-1",
              action: "review_products",
              status: "succeeded",
              progress: 100,
              revision: 2,
              message: {},
              result: review,
            },
          ],
        };
      if (path.endsWith("/review_products"))
        return { accepted: true, jobId: "inspection-1" };
      return {};
    });
  it("adopts the completed native source inspection instead of mistaking a job acknowledgement for records", async () => {
    const request = makeRequest();
    mount(request, rights);
    fireEvent.click(
      await screen.findByRole("button", { name: "Inspect source page" }),
    );
    expect(await screen.findByText("Durable source cup")).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Import reviewed page" }),
    ).toBeDisabled();
    expect(request).toHaveBeenCalledWith(
      "/api/apps/migration/actions/review_products",
      { sourceId: "installed" },
      "POST",
      expect.objectContaining({ idempotencyKey: expect.any(String) }),
    );
  });
  it("opens saved source evidence after reload without reporting an imported page or approving it", async () => {
    mount(makeRequest(), rights);
    expect(
      await screen.findByText("Products · Source ready for review"),
    ).toBeVisible();
    fireEvent.click(
      await screen.findByRole("button", { name: "Open source review" }),
    );
    expect(await screen.findByText("Durable source cup")).toBeVisible();
    expect(screen.getByRole("checkbox")).not.toBeChecked();
    expect(screen.queryByText("undefined / undefined")).not.toBeInTheDocument();
  });
  it("discards a late inspection when the merchant switches source domains", async () => {
    let finish: (value: unknown) => void = () => {};
    const request = vi.fn(async (path: string) => {
      if (path === "/api/apps")
        return { packages: [{ id: "migration", active: true }] };
      if (path.endsWith("/jobs")) return { jobs: [] };
      if (path.endsWith("/review_products"))
        return new Promise((resolve) => {
          finish = resolve;
        });
      return {};
    });
    mount(request, rights);
    fireEvent.click(
      await screen.findByRole("button", { name: "Inspect source page" }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Categories & hierarchy" }),
    );
    finish(review);
    await deps.waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Inspect source page" }),
      ).toBeEnabled(),
    );
    expect(screen.queryByText("Durable source cup")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Import reviewed page" }),
    ).not.toBeInTheDocument();
  });
  it("shows variant options, private status and source stock before approval", async () => {
    const page = {
      ...review,
      records: [
        {
          ...review.records[0],
          data: {
            ...review.records[0].data,
            parentSourceId: "8",
            options: { Colour: "Red" },
            catalogActive: false,
            stock: 4,
            sku: "RED-9",
          },
        },
      ],
    };
    const request = vi.fn(async (path: string) => {
      if (path === "/api/apps")
        return { packages: [{ id: "migration", active: true }] };
      if (path.endsWith("/jobs")) return { jobs: [] };
      return page;
    });
    mount(request, rights);
    fireEvent.click(
      await screen.findByRole("button", { name: "Inspect source page" }),
    );
    expect(await screen.findByText("Colour: Red")).toBeVisible();
    expect(screen.getByText("Hidden at source")).toBeVisible();
    expect(screen.getByText("RED-9")).toBeVisible();
    expect(screen.getByText("Source stock")).toBeVisible();
    expect(screen.getByText("4")).toBeVisible();
  });
}

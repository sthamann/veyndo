/** Review and coupon previews expose the business conditions that the merchant is actually approving. */
export function feedbackTests(deps: any, mount: any) {
  const { screen, fireEvent, expect, it, vi } = deps;
  it("keeps imported reviews behind PII while coupon review uses automation rights", async () => {
    const request = vi.fn().mockResolvedValue({
      packages: [{ id: "migration", active: true }],
      jobs: [],
    });
    mount(request, [
      "apps.read",
      "apps.manage",
      "catalog.read",
      "automation.read",
      "automation.manage",
    ]);
    expect(
      await screen.findByRole("button", { name: "Historical reviews" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Coupons & remaining uses" }),
    ).toBeEnabled();
    fireEvent.click(
      screen.getByRole("button", { name: "Coupons & remaining uses" }),
    );
    expect(screen.queryByLabelText(/Private import destination/)).toBeNull();
    expect(
      screen.queryByLabelText("Reviewed destination tax rate (%)"),
    ).toBeNull();
  });

  it("shows original review evidence and pending moderation before approval", async () => {
    const request = vi.fn(async (path: string) => {
      if (path === "/api/apps")
        return { packages: [{ id: "migration", active: true }] };
      if (path.endsWith("/jobs")) return { jobs: [] };
      return {
        sourceVersion: "wc/v3",
        kind: "reviews",
        records: [
          {
            sourceId: "96",
            kind: "reviews",
            warnings: [],
            data: {
              title: "Original assessment",
              text: "Original source content",
              rating: 5,
              sourceAuthor: "Original reviewer",
              createdAt: "2020-01-02T03:04:05Z",
              sourceVerified: true,
            },
          },
        ],
        recordDigests: ["a".repeat(64)],
      };
    });
    mount(request, [
      "apps.read",
      "apps.manage",
      "catalog.read",
      "catalog.write",
      "customers.pii",
    ]);
    fireEvent.click(
      await screen.findByRole("button", { name: "Historical reviews" }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Inspect source page" }),
    );
    expect(await screen.findByText("Original source content")).toBeVisible();
    expect(screen.getByText("Original reviewer")).toBeVisible();
    expect(screen.getByText(/2020/)).toBeVisible();
    expect(screen.getByText("5 / 5")).toBeVisible();
    expect(screen.getByText(/Hidden until native moderation/)).toBeVisible();
  });
  it("shows coupon remaining uses, source currency and original spend bounds before approval", async () => {
    const request = vi.fn(async (path: string) => {
      if (path === "/api/apps")
        return { packages: [{ id: "migration", active: true }] };
      if (path.endsWith("/jobs")) return { jobs: [] };
      return {
        sourceVersion: "wc/v3",
        kind: "coupons",
        records: [
          {
            sourceId: "97",
            kind: "coupons",
            warnings: [],
            data: {
              code: "WELCOME",
              currency: "EUR",
              destination: { amount: 10, kind: "percentage", maxUses: 3 },
              sourceRules: {
                minimum_amount: "20.00",
                maximum_amount: "100.00",
                usage_count: 2,
              },
            },
          },
        ],
        recordDigests: ["b".repeat(64)],
      };
    });
    mount(request, [
      "apps.read",
      "apps.manage",
      "automation.read",
      "automation.manage",
    ]);
    fireEvent.click(
      await screen.findByRole("button", { name: "Coupons & remaining uses" }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Inspect source page" }),
    );
    expect(await screen.findByText("WELCOME")).toBeVisible();
    expect(screen.getByText("20.00 EUR")).toBeVisible();
    expect(screen.getByText("100.00 EUR")).toBeVisible();
    expect(
      screen.getByText(/Inactive until explicit native review/),
    ).toBeVisible();
    expect(screen.getByText("3")).toBeVisible();
  });
}

/** Explicit tax basis and warnings remain part of the exact reviewed import command. */
export function priceBasisTests(deps: any, mount: any) {
  const { screen, fireEvent, expect, it, vi, waitFor } = deps;
  const rights = [
    "apps.read",
    "apps.manage",
    "catalog.read",
    "catalog.write",
    "environments.manage",
  ];
  const page = {
    sourceId: "installed",
    kind: "products",
    sourceVersion: "presta-8",
    adapterVersion: 1,
    records: [
      {
        sourceId: "7",
        kind: "products",
        warnings: ["source_price_tax_basis_requires_review"],
        data: {
          name: { "en-GB": "Original net cup" },
          priceBasis: "net",
          price: { minor: 1250, currency: "EUR", scale: 2 },
        },
      },
    ],
    recordDigests: ["a".repeat(64)],
  };
  const client = (review: any) =>
    vi.fn(async (path: string) => {
      if (path === "/api/apps")
        return { packages: [{ id: "migration", active: true }] };
      if (path.endsWith("/jobs")) return { jobs: [] };
      if (path.endsWith("/review_products")) return review;
      if (path === "/api/environments") return { id: "private" };
      return { jobId: "new" };
    });
  it("confirms a declared net source basis and the exact visible warnings before native queueing", async () => {
    const request = client(page);
    mount(request, rights);
    fireEvent.click(
      await screen.findByRole("button", { name: "Inspect source page" }),
    );
    expect(await screen.findByLabelText("Source price basis")).toHaveValue(
      "net",
    );
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
        expect.objectContaining({
          options: expect.objectContaining({
            sourcePriceBasis: "net",
            acknowledgedWarnings: ["source_price_tax_basis_requires_review"],
          }),
        }),
        "POST",
        expect.anything(),
      ),
    );
  });
  it("requires an explicit choice when source publication does not declare a price basis", async () => {
    const unknown: any = structuredClone(page);
    unknown.records[0].data.priceBasis = null;
    mount(client(unknown), rights);
    fireEvent.click(
      await screen.findByRole("button", { name: "Inspect source page" }),
    );
    fireEvent.change(
      await screen.findByLabelText("Reviewed destination tax rate (%)"),
      { target: { value: "19" } },
    );
    fireEvent.click(screen.getByRole("checkbox"));
    expect(
      screen.getByRole("button", { name: "Import reviewed page" }),
    ).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Source price basis"), {
      target: { value: "gross" },
    });
    expect(
      screen.getByRole("button", { name: "Import reviewed page" }),
    ).toBeDisabled();
    fireEvent.click(screen.getByRole("checkbox"));
    expect(
      screen.getByRole("button", { name: "Import reviewed page" }),
    ).toBeEnabled();
  });
}

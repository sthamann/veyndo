/** A merchant can inspect original address/line evidence before approving the native CRM command. */
export function crmTests(deps: any, mount: any) {
  const { screen, fireEvent, expect, it, vi } = deps;
  for (const [kind, label] of [
    ["customers", "Customers & addresses"],
    ["orders", "Historical orders"],
  ]) {
    it(`shows original ${kind} evidence before approval`, async () => {
      const request = vi.fn(async (path: string) => {
        if (path === "/api/merchant/customers/create-context")
          return {
            elements: [
              {
                id: "consumer",
                priceBasis: "consumer",
                translations: { "en-GB": { name: "Original consumer group" } },
              },
            ],
          };
        if (path === "/api/apps")
          return { packages: [{ id: "migration", active: true }] };
        if (path.endsWith("/jobs")) return { jobs: [] };
        return {
          sourceId: "installed",
          sourceVersion: "source-1",
          kind,
          adapterVersion: 1,
          recordDigests: ["a".repeat(64)],
          records: [
            {
              sourceId: "old-7",
              kind,
              warnings: [],
              data: {
                firstName: "Ada",
                lastName: "Original",
                email: "synthetic@example.test",
                billingAddress: {
                  name: "Ada Original",
                  street: "Original Street 1",
                  postalCode: "10115",
                  city: "Berlin",
                  country: "DE",
                  countryStateId: "DE-BE",
                },
                additionalAddresses: [
                  {
                    street: "Warehouse Street 3",
                    postalCode: "10115",
                    city: "Berlin",
                    country: "DE",
                  },
                ],
                lines:
                  kind === "orders"
                    ? [
                        {
                          sourceId: "old-line",
                          label: "Historical mug",
                          quantity: 2,
                          unitPrice: { minor: 625, currency: "EUR", scale: 2 },
                        },
                      ]
                    : undefined,
              },
            },
          ],
        };
      });
      mount(request, [
        "apps.read",
        "apps.manage",
        "customers.read",
        "customers.write",
        "customers.pii",
        "orders.read",
        "orders.write",
      ]);
      fireEvent.click(await screen.findByRole("button", { name: label }));
      fireEvent.click(
        screen.getByRole("button", { name: "Inspect source page" }),
      );
      expect(await screen.findByText("synthetic@example.test")).toBeVisible();
      if (kind === "customers")
        expect(
          screen.getByRole("option", { name: "Original consumer group" }),
        ).toBeVisible();
      expect(screen.getByText(/Original Street 1/)).toBeVisible();
      fireEvent.click(screen.getByText(/Additional addresses · 1/));
      expect(screen.getByText(/Warehouse Street 3/)).toBeVisible();
      if (kind === "orders") {
        fireEvent.click(screen.getByText(/Original order items · 1/));
        expect(screen.getByText(/2 × Historical mug/)).toHaveTextContent(
          "6.25 EUR",
        );
      }
      expect(
        screen.getByRole("button", { name: "Import reviewed page" }),
      ).toBeDisabled();
    });
  }
}

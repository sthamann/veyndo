/** Embedded CRM navigation must include unsaved native address fields and default choices. */
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { expect, it, vi } from "vitest";
import CustomersManager from "../../src/admin/customers/CustomersManager";
import { LocaleProvider } from "../../src/shared/i18n/i18n";

it("reports address changes to the outer workspace and guards linked-order navigation", async () => {
  const dirty = vi.fn(),
    open = vi.fn();
  const customer = {
    email: "buyer@example.test",
    revision: 1,
    customerNumber: "C-DRAFT",
    profile: { name: "Buyer" },
    company: null,
    customerGroup: "consumer",
    active: true,
    orders: [
      {
        id: "order-one",
        orderNumber: "ORDER-ONE",
        state: "placed",
        cart: { price: { totalPrice: 12 } },
      },
    ],
  };
  const request = vi.fn(async (path: string) => {
    if (path === "/api/auth/access")
      return {
        permissions: ["customers.read", "customers.write", "orders.read"],
      };
    if (path.endsWith("/create-context"))
      return { elements: [], mainLocale: "en-GB", countries: ["DE"] };
    if (path === "/store-api/checkout/options") return { countries: ["DE"] };
    if (path.endsWith("/addresses"))
      return { elements: [], customerRevision: 1 };
    return structuredClone(customer);
  });
  render(
    <CustomersManager
      request={request}
      initialEmail={customer.email}
      onEntity={open}
      onDirtyChange={dirty}
    />,
    { wrapper: LocaleProvider },
  );
  fireEvent.click(await screen.findByRole("button", { name: "Add address" }));
  await waitFor(() => expect(dirty).toHaveBeenLastCalledWith(false));
  fireEvent.change(screen.getByRole("textbox", { name: /Street/ }), {
    target: { value: "Draft lane" },
  });
  await waitFor(() => expect(dirty).toHaveBeenLastCalledWith(true));
  fireEvent.click(screen.getByRole("button", { name: /ORDER-ONE/ }));
  expect(open).not.toHaveBeenCalled();
  expect(screen.getByRole("dialog")).toBeVisible();
  fireEvent.click(
    within(screen.getByRole("dialog")).getByRole("button", { name: "Cancel" }),
  );
  expect(screen.getByRole("textbox", { name: /Street/ })).toHaveValue(
    "Draft lane",
  );
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  await waitFor(() => expect(dirty).toHaveBeenLastCalledWith(false));
  fireEvent.click(screen.getByRole("button", { name: "Add address" }));
  fireEvent.click(screen.getByRole("checkbox", { name: /billing/i }));
  await waitFor(() => expect(dirty).toHaveBeenLastCalledWith(true));
});

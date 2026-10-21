/** Current-shop rights cannot inherit a late privileged workspace response. */
import { act, renderHook, waitFor } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { useAutomationAccess } from "../../src/admin/automation/useAutomationAccess";
const permissions = [
  "automation.manage",
  "automation.read",
  "orders.read",
  "catalog.read",
  "customers.read",
  "customers.pii",
  "payments.read",
  "documents.read",
  "b2b.read",
];
it("requires every current history scope without denying ordinary rule management", async () => {
  const request = vi.fn().mockResolvedValue({
    permissions: permissions.filter((s) => s !== "customers.pii"),
  });
  const { result } = renderHook(() => useAutomationAccess(request));
  await waitFor(() => expect(result.current.manage).toBe(true));
  expect(result.current.canCompare).toBe(false);
});
it("immediately clears prior access and ignores late privileged grants after switching shops", async () => {
  let resolve!: (value: unknown) => void;
  const old = vi.fn(
    () =>
      new Promise((r) => {
        resolve = r;
      }),
  );
  const denied = vi.fn().mockRejectedValue(new Error("unavailable"));
  const { result, rerender } = renderHook(
    ({ request }) => useAutomationAccess(request),
    { initialProps: { request: old } },
  );
  rerender({ request: denied });
  expect(result.current.manage).toBe(false);
  expect(result.current.canCompare).toBe(false);
  await act(async () => resolve({ permissions }));
  expect(result.current.manage).toBe(false);
  expect(result.current.canCompare).toBe(false);
});

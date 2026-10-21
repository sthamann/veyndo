/** Compare the actual rule draft; reject stale workspace results and distinguish unavailable inputs. */
import {
  act,
  fireEvent,
  render as rtlRender,
  screen,
} from "@testing-library/react";
import type { ReactNode } from "react";
import { expect, it, vi } from "vitest";
import RuleHistory from "../../src/admin/automation/RuleHistory";
import { LocaleScope } from "../../src/shared/i18n/i18n";
function render(ui: ReactNode) {
  return rtlRender(ui, {
    wrapper: ({ children }) => (
      <LocaleScope locale="en-GB">{children}</LocaleScope>
    ),
  });
}
const props = {
  id: "threshold",
  revision: 2,
  condition: { type: "cartCartAmount", operator: ">=", amount: 100 },
  flows: [
    {
      id: "orders",
      revision: 1,
      data: { name: { "en-GB": "Order processing" } },
    },
  ],
  advanced: false,
};
const report = {
  sampled: 2,
  evaluated: 1,
  changed: 1,
  unavailable: 1,
  revision: 2,
  baselineDigest: "saved-digest",
  candidateDigest: "draft-digest",
  results: [
    {
      jobId: "one",
      status: "evaluated",
      before: false,
      after: true,
      capturedAt: "2026-10-21T12:00:00Z",
    },
    { jobId: "two", status: "unavailable" },
  ],
};
function start() {
  fireEvent.change(screen.getByLabelText("Use records from Flow"), {
    target: { value: "orders" },
  });
  fireEvent.click(screen.getByText("Compare conditions"));
}
it("runs only on explicit comparison with exact unsaved condition, source and bounded sample", async () => {
  const request = vi.fn().mockResolvedValue(report);
  render(<RuleHistory {...props} request={request} />);
  expect(request).not.toHaveBeenCalled();
  expect(screen.getByText("Compare conditions")).toBeDisabled();
  start();
  expect(await screen.findByText("2026-10-21T12:00:00Z")).toBeInTheDocument();
  expect(request).toHaveBeenCalledExactlyOnceWith(
    "/api/automation/rules/compare-history",
    {
      ruleId: "threshold",
      revision: 2,
      flowId: "orders",
      condition: props.condition,
      limit: 25,
    },
  );
  expect(screen.getByText("Matches")).toBeInTheDocument();
  expect(screen.getByText("Does not match")).toBeInTheDocument();
  expect(
    screen.getByText(/Required recorded data is missing/),
  ).toBeInTheDocument();
});
it("discards a late comparison after changing workspace", async () => {
  let finish!: (v: unknown) => void;
  const request = vi.fn(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  const { rerender } = render(<RuleHistory {...props} request={request} />);
  start();
  const next = vi.fn();
  rerender(<RuleHistory {...props} request={next} />);
  await act(async () => finish(report));
  expect(screen.queryByText("2026-10-21T12:00:00Z")).toBeNull();
  expect(screen.getByText("Compare conditions")).toBeDisabled();
  expect(next).not.toHaveBeenCalled();
});
it("invalidates an existing result when the draft or saved revision changes", async () => {
  const request = vi.fn().mockResolvedValue(report);
  const { rerender } = render(<RuleHistory {...props} request={request} />);
  start();
  await screen.findByText("2026-10-21T12:00:00Z");
  rerender(<RuleHistory {...props} request={request} revision={3} />);
  expect(screen.queryByText("2026-10-21T12:00:00Z")).toBeNull();
  start();
  await screen.findByText("2026-10-21T12:00:00Z");
  rerender(
    <RuleHistory
      {...props}
      request={request}
      condition={{ type: "alwaysValid" }}
    />,
  );
  expect(screen.queryByText("2026-10-21T12:00:00Z")).toBeNull();
});
it("does not represent an empty sample as a passed test", async () => {
  const request = vi
    .fn()
    .mockResolvedValue({ ...report, sampled: 0, results: [] });
  render(<RuleHistory {...props} request={request} />);
  start();
  expect(await screen.findByText(/no stored records yet/)).toBeInTheDocument();
  expect(screen.queryByText("Different result")).toBeNull();
});
it("explains missing saved baseline and excludes a divergent advanced JSON draft", () => {
  const request = vi.fn();
  const { rerender } = render(
    <RuleHistory {...props} request={request} revision={0} />,
  );
  expect(screen.getByText(/Save this rule once/)).toBeInTheDocument();
  expect(screen.queryByText("Compare conditions")).toBeNull();
  rerender(<RuleHistory {...props} request={request} advanced />);
  expect(
    screen.getByText(/Return to the visual rule editor/),
  ).toBeInTheDocument();
  expect(request).not.toHaveBeenCalled();
});
it("shows a bounded safe error without leaking provider or customer output", async () => {
  const request = vi.fn().mockRejectedValue(new Error("private@example.test"));
  render(<RuleHistory {...props} request={request} />);
  start();
  expect(await screen.findByRole("alert")).toHaveTextContent("Reload the rule");
  expect(screen.queryByText(/private@example/)).toBeNull();
});
it("renders the merchant explanation in German", () => {
  render(
    <LocaleScope locale="de-DE">
      <RuleHistory {...props} request={vi.fn()} />
    </LocaleScope>,
  );
  expect(
    screen.getByText("Änderung an früheren Bestellungen testen"),
  ).toBeInTheDocument();
  expect(
    screen.getByText(/Damals nicht passende Ereignisse/),
  ).toBeInTheDocument();
});

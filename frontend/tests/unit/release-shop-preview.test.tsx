/** Current shop previews preserve native scope and never treat iframe loading as saved evidence. */
import { act, fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import ReleaseShopPreview from "../../src/admin/environments/ReleaseShopPreview";
import { LocaleProvider } from "../../src/shared/i18n/i18n";
import type { Report } from "../../src/admin/scenarios/scenario-types";
const report: Report = {
  id: "saved",
  runs: [
    {
      taskId: "first",
      revision: 1,
      state: "ready",
      configurationReview: "current",
      scenario: {
        channel: "summer & sun",
        currency: "EUR",
        scale: 2,
        index: 0,
        instruction: "Browse",
        profile: {
          id: "buyer",
          name: "French customer",
          goal: "Browse",
          locale: "fr-FR",
          country: "FR",
          budgetMinor: 5000,
        },
      },
    },
  ],
};
function setup(request = vi.fn(async () => report), value = report) {
  return {
    request,
    ...render(
      <ReleaseShopPreview
        environment="stage & private"
        request={request}
        report={value}
      />,
      { wrapper: LocaleProvider },
    ),
  };
}
it("rechecks the exact saved report and opens only the native sandbox channel and language", async () => {
  const { request } = setup();
  expect(
    screen.queryByTitle("Shop preview for this test"),
  ).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Preview shop" }));
  const frame = await screen.findByTitle("Shop preview for this test");
  const url = new URL(frame.getAttribute("src")!, "https://app.veyndo.ai");
  expect(request).toHaveBeenCalledWith("/api/agent/scenarios/saved");
  expect(Object.fromEntries(url.searchParams)).toEqual({
    shop: "stage & private",
    sandbox: "1",
    channel: "summer & sun",
    lang: "fr-FR",
    language: "fr-FR",
  });
  expect(frame).toHaveAttribute(
    "sandbox",
    "allow-scripts allow-same-origin allow-forms",
  );
  fireEvent.change(screen.getByLabelText("Viewport"), {
    target: { value: "mobile" },
  });
  expect(frame.parentElement).toHaveAttribute("data-device", "mobile");
  fireEvent.click(screen.getByRole("button", { name: "Close preview" }));
  expect(
    screen.queryByTitle("Shop preview for this test"),
  ).not.toBeInTheDocument();
});
it("never opens a preview after denied access and allows retry", async () => {
  const request = vi
    .fn()
    .mockRejectedValueOnce(new Error("403"))
    .mockResolvedValue(report);
  setup(request);
  fireEvent.click(screen.getByRole("button", { name: "Preview shop" }));
  await screen.findByRole("alert");
  expect(
    screen.queryByTitle("Shop preview for this test"),
  ).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Preview shop" }));
  await screen.findByTitle("Shop preview for this test");
});
it("discards a pending recheck when the preview is closed", async () => {
  let resolve!: (value: Report) => void;
  setup(
    vi.fn(
      () =>
        new Promise<Report>((r) => {
          resolve = r;
        }),
    ),
  );
  fireEvent.click(screen.getByRole("button", { name: "Preview shop" }));
  fireEvent.click(screen.getByRole("button", { name: "Close preview" }));
  await act(async () => resolve(report));
  expect(
    screen.queryByTitle("Shop preview for this test"),
  ).not.toBeInTheDocument();
});
it("rejects a missing run instead of silently opening the default channel", async () => {
  setup(vi.fn(async () => ({ id: "saved", runs: [] })));
  fireEvent.click(screen.getByRole("button", { name: "Preview shop" }));
  await screen.findByRole("alert");
  expect(
    screen.queryByTitle("Shop preview for this test"),
  ).not.toBeInTheDocument();
});
it("changing the profile removes the old frame before opening the new channel", async () => {
  const other = {
    ...report.runs[0],
    taskId: "second",
    scenario: {
      ...report.runs[0].scenario!,
      channel: "second",
      profile: { ...report.runs[0].scenario!.profile, name: "Other customer" },
    },
  };
  const value = { ...report, runs: [...report.runs, other] };
  setup(
    vi.fn(async () => value),
    value,
  );
  fireEvent.click(screen.getByRole("button", { name: "Preview shop" }));
  await screen.findByTitle("Shop preview for this test");
  fireEvent.change(screen.getByLabelText("Customer profile"), {
    target: { value: "second" },
  });
  expect(
    screen.queryByTitle("Shop preview for this test"),
  ).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Preview shop" }));
  expect(
    await screen.findByTitle("Shop preview for this test"),
  ).toHaveAttribute("src", expect.stringContaining("channel=second"));
});

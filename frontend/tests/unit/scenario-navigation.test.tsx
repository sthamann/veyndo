/** Saved release evidence returns to its exact sandbox/channel, with stale query context cleared. */
import { act, renderHook } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { useScenarioNavigation } from "../../src/admin/scenarios/useScenarioNavigation";
const context = vi.hoisted(() => ({
  request: vi.fn(),
  environment: "",
  refreshEnvironments: vi.fn(async () => {}),
  setEnvironment: vi.fn(),
  selectTab: vi.fn(),
}));
vi.mock("../../src/admin/shell/StudioContext", () => ({
  useStudio: () => context,
}));
it("retains sandbox, channel and saved report and clears it for a new test", async () => {
  history.replaceState(
    null,
    "",
    "/?scenarioSource=old&shop=unit-shop#merchant",
  );
  const { result } = renderHook(useScenarioNavigation);
  await act(async () => result.current("summer", "draft", undefined, "saved"));
  expect(context.setEnvironment).toHaveBeenCalledWith("draft");
  const url = new URL(location.href);
  expect(url.searchParams.get("scenarioChannel")).toBe("summer");
  expect(url.searchParams.get("scenarioId")).toBe("saved");
  expect(url.searchParams.has("scenarioSource")).toBe(false);
  expect(context.selectTab).toHaveBeenCalledWith("knowledge");
  await act(async () => result.current());
  expect(new URL(location.href).searchParams.has("scenarioId")).toBe(false);
});

/** Workspace changes cannot carry a previous sandbox into another shop. */
import { act, renderHook } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { useStudioEnvironment } from "../../src/admin/shell/useStudioEnvironment";
it("keeps separate choices for each shop and remembers an explicit return to live", () => {
  const { result, rerender, unmount } = renderHook(
    ({ shop }) => useStudioEnvironment(shop),
    { initialProps: { shop: "one" } },
  );
  act(() => result.current[1]("private-one"));
  rerender({ shop: "two" });
  expect(result.current[0]).toBe("");
  act(() => result.current[1]("private-two"));
  rerender({ shop: "one" });
  expect(result.current[0]).toBe("private-one");
  act(() => result.current[1](() => ""));
  unmount();
  const restored = renderHook(() => useStudioEnvironment("one"));
  expect(restored.result.current[0]).toBe("");
  expect(sessionStorage.getItem("veyndo-studio-environment:two")).toBe(
    "private-two",
  );
});
it("can still select a private scope when browser storage is unavailable", () => {
  const read = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
    throw Error("Blocked");
  });
  const write = vi
    .spyOn(Storage.prototype, "setItem")
    .mockImplementation(() => {
      throw Error("Blocked");
    });
  const { result } = renderHook(() => useStudioEnvironment("one"));
  act(() => result.current[1]("private-one"));
  expect(result.current[0]).toBe("private-one");
  read.mockRestore();
  write.mockRestore();
});

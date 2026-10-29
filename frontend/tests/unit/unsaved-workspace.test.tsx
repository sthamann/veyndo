/** Native editors expose actual dirty state to embedded hosts and protect page reload until saved. */
import { render, renderHook } from "@testing-library/react";
import { expect, it } from "vitest";
import { useUnsavedWorkspace } from "../../src/shared/ui/useUnsavedWorkspace";
import ConfirmDialog from "../../src/shared/ui/ConfirmDialog";

it("blocks leaving only while dirty and removes its guard after save and unmount", () => {
  let current = false;
  const report = (dirty: boolean) => {
    current = dirty;
  };
  const hook = renderHook(({ dirty }) => useUnsavedWorkspace(dirty, report), {
    initialProps: { dirty: false },
  });
  expect(
    window.dispatchEvent(new Event("beforeunload", { cancelable: true })),
  ).toBe(true);
  hook.rerender({ dirty: true });
  expect(current).toBe(true);
  expect(
    window.dispatchEvent(new Event("beforeunload", { cancelable: true })),
  ).toBe(false);
  hook.rerender({ dirty: false });
  expect(current).toBe(false);
  expect(
    window.dispatchEvent(new Event("beforeunload", { cancelable: true })),
  ).toBe(true);
  hook.rerender({ dirty: true });
  hook.unmount();
  expect(current).toBe(false);
  expect(
    window.dispatchEvent(new Event("beforeunload", { cancelable: true })),
  ).toBe(true);
});

it("keeps a native editor confirmation inside its open modal so it is not inert behind the browser top layer", () => {
  const host = document.createElement("dialog");
  host.setAttribute("open", "");
  const trigger = document.createElement("button");
  host.append(trigger);
  document.body.append(host);
  trigger.focus();
  const rendered = render(
    <ConfirmDialog
      title="Discard changes"
      onCancel={() => {}}
      onConfirm={() => {}}
    >
      Unsaved changes
    </ConfirmDialog>,
    { container: host },
  );
  expect(host.querySelector('[role="dialog"]')).not.toBeNull();
  rendered.unmount();
  host.remove();
});

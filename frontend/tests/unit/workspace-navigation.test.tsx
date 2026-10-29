/** Navigation guards preserve an embedded native editor's dirty draft. */
import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import AgentWorkSurface from "../../src/admin/workspace/AgentWorkSurface";
import { StudioContext } from "../../src/admin/shell/StudioContext";
import { LocaleScope } from "../../src/shared/i18n/i18n";
vi.mock("../../src/admin/workspace/AgentViewDirectory", () => ({
  default: ({ selected, onSelect, onDirtyChange }: any) =>
    selected ? (
      <>
        <input aria-label="Native draft" onChange={() => onDirtyChange(true)} />
        <button onClick={() => onSelect(undefined)}>Back to records</button>
        <button
          onClick={() => {
            onDirtyChange(false);
            onSelect(undefined);
          }}
        >
          Confirmed native discard
        </button>
      </>
    ) : (
      <button onClick={() => onSelect("desk")}>Open native record</button>
    ),
}));
vi.mock("../../src/admin/catalog/CatalogIntake", () => ({
  default: () => (
    <dialog
      open
      aria-label="Busy native intake"
      onCancel={(event) => event.preventDefault()}
    >
      Saving private products
    </dialog>
  ),
}));
it("does not dismiss the working view when a busy nested intake cancels Escape", async () => {
  const request = vi.fn(async () => ({
    permissions: ["catalog.read", "catalog.write"],
  }));
  const close = vi.fn();
  render(
    <LocaleScope locale="en-GB">
      <StudioContext.Provider
        value={
          {
            request,
            liveRequest: request,
            access: ["catalog.read", "catalog.write"],
            openEntity: vi.fn(),
            tabLabel: () => "Products",
            token: "",
            workspace: "synthetic",
            environment: "",
            locale: "en-GB",
          } as any
        }
      >
        <AgentWorkSurface
          candidate={{
            entity: "products",
            criteria: {},
            components: ["records", "intake"],
          }}
          onClose={close}
        />
      </StudioContext.Provider>
    </LocaleScope>,
  );
  fireEvent.click(await screen.findByRole("button", { name: "Upload CSV" }));
  const inner = await screen.findByRole("dialog", {
    name: "Busy native intake",
  });
  fireEvent(inner, new Event("cancel", { cancelable: true, bubbles: false }));
  expect(close).not.toHaveBeenCalled();
  expect(inner).toBeVisible();
});
it("asks before discarding through Back and keeps the draft on Cancel", async () => {
  const request = vi.fn(async () => ({ permissions: ["catalog.read"] }));
  const close = vi.fn();
  render(
    <LocaleScope locale="en-GB">
      <StudioContext.Provider
        value={
          {
            request,
            liveRequest: request,
            access: ["catalog.read"],
            openEntity: vi.fn(),
            tabLabel: () => "Products",
            token: "",
            workspace: "synthetic",
            environment: "",
            locale: "en-GB",
          } as any
        }
      >
        <AgentWorkSurface
          candidate={{
            entity: "products",
            criteria: {},
            components: ["records", "details"],
          }}
          onClose={close}
        />
      </StudioContext.Provider>
    </LocaleScope>,
  );
  fireEvent.click(
    await screen.findByRole("button", { name: "Open native record" }),
  );
  fireEvent.change(screen.getByLabelText("Native draft"), {
    target: { value: "Keep this" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Back to records" }));
  expect(
    await screen.findByRole("heading", { name: "Leave unsaved changes?" }),
  ).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  expect(screen.getByLabelText("Native draft")).toHaveValue("Keep this");
  fireEvent.click(screen.getByRole("button", { name: "Back to records" }));
  fireEvent.click(screen.getByRole("button", { name: "Leave draft" }));
  expect(
    screen.getByRole("button", { name: "Open native record" }),
  ).toBeVisible();
  expect(close).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Open native record" }));
  fireEvent.change(screen.getByLabelText("Native draft"), {
    target: { value: "Discard once" },
  });
  fireEvent.click(
    screen.getByRole("button", { name: "Confirmed native discard" }),
  );
  expect(
    screen.queryByRole("heading", { name: "Leave unsaved changes?" }),
  ).toBeNull();
  expect(
    screen.getByRole("button", { name: "Open native record" }),
  ).toBeVisible();
});

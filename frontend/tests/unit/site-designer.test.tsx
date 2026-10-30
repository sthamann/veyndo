/** Register package-owned cases and isolate browser frame rendering in component-level tests. */
import { vi } from "vitest";
vi.mock(
  "../../../extensions/apps/site-builder/studio/StorefrontCanvas",
  () => ({
    default: ({ children }: { children?: React.ReactNode }) => (
      <div data-testid="actual-storefront">
        {children || "Native storefront"}
      </div>
    ),
  }),
);
import "../../../extensions/apps/site-builder/tests/designer-cases";
import "../../../extensions/apps/site-builder/tests/onboarding-cases";
import "../../../extensions/apps/site-builder/tests/overview-cases";

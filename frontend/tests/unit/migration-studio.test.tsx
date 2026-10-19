/** Register app-owned migration UI regressions in the shared browser test harness. */
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { migrationStudioTests } from "../../../extensions/apps/migration/tests/studio.test";
migrationStudioTests({ render, screen, fireEvent, waitFor, expect, it, vi });

/** Register the app-owned connected migration workflow regressions. */
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { webcrypto } from "node:crypto";
import { migrationProgressTests } from "../../../extensions/apps/migration/tests/progress.test";
migrationProgressTests({
  render,
  screen,
  fireEvent,
  waitFor,
  expect,
  it,
  vi,
  webcrypto,
});

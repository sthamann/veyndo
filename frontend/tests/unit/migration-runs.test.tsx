/** Register app-owned durable plan regressions. */
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { migrationRunTests } from "../../../extensions/apps/migration/tests/runs.test";
migrationRunTests({ render, screen, fireEvent, waitFor, expect, it, vi });

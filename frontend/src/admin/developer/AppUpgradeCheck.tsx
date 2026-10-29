/** Explicitly inspect an immutable build in its owned stage, with response fencing on account/environment changes. */
import { useState } from "react";
import type { RequestFn } from "../shell/studio-types";
import type { Build } from "./useAppStudio";
import AppUpgradeReport, { type UpgradeReport } from "../apps/AppUpgradeReport";
import { useUpgradeText } from "../apps/upgrade-i18n";
export default function AppUpgradeCheck({
  build,
  request,
  disabled,
  install,
}: {
  build: Build;
  request: RequestFn;
  disabled: boolean;
  install?: { label: string; run: () => void };
}) {
  const t = useUpgradeText(),
    [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{
    request: RequestFn;
    key: string;
    report?: UpgradeReport;
    error?: string;
  }>();
  const key = `${build.environment}:${build.digest}`,
    current =
      result?.request === request && result.key === key ? result : undefined;
  return (
    <div className="app-upgrade-check">
      <button
        className="studio-secondary"
        disabled={disabled || busy}
        onClick={async () => {
          setBusy(true);
          setResult(undefined);
          try {
            const v = await request("/api/apps/review", {
              manifest: build.manifest,
              environment: build.environment,
            });
            setResult({ request, key, report: v.upgrade });
          } catch (e) {
            setResult({ request, key, error: (e as Error).message });
          } finally {
            setBusy(false);
          }
        }}
      >
        {t(busy ? "checking" : "check")}
      </button>
      {current?.report && <AppUpgradeReport report={current.report} />}
      {current?.report?.ready && install && (
        <button
          className="studio-primary"
          disabled={disabled || busy}
          onClick={install.run}
        >
          {install.label}
        </button>
      )}
      {current?.error && <p role="alert">{current.error}</p>}
    </div>
  );
}

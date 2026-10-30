/** Actor-private saved scenario evidence sits beside native release diffs without becoming an approval gate. */
import { useEffect, useMemo, useState } from "react";
import type { RequestFn } from "../shell/studio-types";
import type { Report, Scenario } from "../scenarios/scenario-types";
import { canTestCustomers } from "../scenarios/scenario-access";
import ScenarioReport from "../scenarios/ScenarioReport";
import { useReleaseTestText } from "./release-tests-i18n";
import "../scenarios/scenarios.css";
import "./release-tests.css";
export default function ReleaseScenarios({
  environment,
  rights,
  sandboxRequest,
  onOpen,
}: {
  environment: string;
  rights: string[];
  sandboxRequest: (environment: string) => RequestFn;
  onOpen: (
    environment: string,
    channel: string,
    scenario?: string,
  ) => void | Promise<void>;
}) {
  const request = useMemo(
    () => sandboxRequest(environment),
    [sandboxRequest, environment],
  );
  const allowed = !!environment && canTestCustomers(rights);
  return allowed ? (
    <Review request={request} environment={environment} onOpen={onOpen} />
  ) : null;
}
function Review({
  request,
  environment,
  onOpen,
}: {
  request: RequestFn;
  environment: string;
  onOpen: (
    environment: string,
    channel: string,
    scenario?: string,
  ) => void | Promise<void>;
}) {
  const t = useReleaseTestText();
  const [refresh, setRefresh] = useState(0);
  const [navigation, setNavigation] = useState<{
    request: RequestFn;
    busy: boolean;
    error?: boolean;
  }>();
  const [list, setList] = useState<{
    request: RequestFn;
    items: Scenario[];
    error?: boolean;
    refresh: number;
  }>();
  const [selection, setSelection] = useState<{
    request: RequestFn;
    id: string;
  }>();
  const [result, setResult] = useState<{
    request: RequestFn;
    id: string;
    report?: Report;
    error?: boolean;
    at: string;
    refresh: number;
  }>();
  const id = selection?.request === request ? selection.id : "";
  const currentList =
    list?.request === request && list.refresh === refresh ? list : undefined;
  const currentResult =
    result?.request === request &&
    result.id === id &&
    result.refresh === refresh
      ? result
      : undefined;
  useEffect(() => {
    let active = true;
    request("/api/agent/scenarios")
      .then((value) => {
        if (!active) return;
        setList({ request, items: value.scenarios, refresh });
        setSelection((previous) =>
          previous?.request === request &&
          value.scenarios.some((item: Scenario) => item.id === previous.id)
            ? previous
            : undefined,
        );
      })
      .catch(() => {
        if (active) setList({ request, items: [], error: true, refresh });
      });
    return () => {
      active = false;
    };
  }, [request, refresh]);
  useEffect(() => {
    if (!id) return;
    let active = true;
    request(`/api/agent/scenarios/${encodeURIComponent(id)}`)
      .then((report: Report) => {
        if (active)
          setResult({
            request,
            id,
            report,
            refresh,
            at: new Date().toLocaleTimeString(),
          });
      })
      .catch(() => {
        if (active) setResult({ request, id, error: true, refresh, at: "" });
      });
    return () => {
      active = false;
    };
  }, [request, id, refresh]);
  const report = currentResult?.report;
  const loading = !currentList || (!!id && !currentResult);
  const navigate = async () => {
    setNavigation({ request, busy: true });
    try {
      await onOpen(
        environment,
        report?.runs[0]?.scenario?.channel ?? "default",
        report?.id,
      );
      setNavigation({ request, busy: false });
    } catch {
      setNavigation({ request, busy: false, error: true });
    }
  };
  return (
    <section className="release-tests" aria-label={t("title")}>
      <h2>{t("title")}</h2>
      <p className="release-tests-hint">{t("hint")}</p>
      <div className="release-tests-controls">
        <label>
          {t("select")}
          <select
            value={id}
            disabled={!currentList?.items.length}
            onChange={(e) => setSelection({ request, id: e.target.value })}
          >
            <option value="">{t("choose")}</option>
            {currentList?.items.map((item) => (
              <option key={item.id} value={item.id}>
                {item.title}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className="studio-secondary"
          disabled={loading}
          onClick={() => setRefresh((v) => v + 1)}
        >
          {t("refresh")}
        </button>
        <button
          type="button"
          className="studio-secondary"
          disabled={navigation?.request === request && navigation.busy}
          onClick={() => void navigate()}
        >
          {t(report ? "open" : "new")}
        </button>
      </div>
      {navigation?.request === request && navigation.error && (
        <p role="alert">{t("openError")}</p>
      )}
      {loading && <p role="status">{t("loading")}</p>}
      {(currentList?.error || currentResult?.error) && (
        <p role="alert">{t("error")}</p>
      )}
      {currentList && !currentList.error && !currentList.items.length && (
        <p>{t("empty")}</p>
      )}
      {report && (
        <>
          <p className="release-tests-time">
            {t("checked")}: <time>{currentResult?.at}</time>
          </p>
          <ScenarioReport report={report} />
        </>
      )}
    </section>
  );
}

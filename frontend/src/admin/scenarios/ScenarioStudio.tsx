/** A compact private customer lab on the existing Studio scope and durable run controls. */
import { useEffect, useMemo, useRef, useState } from "react";
import { useStudio } from "../shell/StudioContext";
import type { RequestFn } from "../shell/studio-types";
import Icon from "../../shared/ui/Icon";
import { useScenarioText } from "./scenario-i18n";
import { canTestCustomers } from "./scenario-access";
import ScenarioProfiles from "./ScenarioProfiles";
import ScenarioSuggestions from "./ScenarioSuggestions";
import ScenarioReport from "./ScenarioReport";
import ScenarioComparison from "./ScenarioComparison";
import type {
  Profile,
  Configuration,
  Scenario,
  Report,
  Run,
} from "./scenario-types";
import "./scenarios.css";
export default function ScenarioStudio({
  request: baseRequest,
  channel = "default",
}: {
  request: RequestFn;
  channel?: string;
}) {
  const request = useMemo<RequestFn>(
    () => (path, body, method, options) =>
      baseRequest(path, body, method, { ...options, salesChannel: channel }),
    [baseRequest, channel],
  );
  const { environment, access, selectTab } = useStudio(),
    t = useScenarioText();
  const allowed = canTestCustomers(access);
  const [instruction, setInstruction] = useState(""),
    [profiles, setProfiles] = useState<Profile[]>([]);
  const [config, setConfig] = useState<Configuration>(),
    [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [selected, setSelected] = useState(""),
    [baseline, setBaseline] = useState(""),
    [report, setReport] = useState<Report>(),
    [comparison, setComparison] = useState<Report>();
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [inference, setInference] = useState<
    { provider: string; model?: string } | undefined
  >();
  const generation = useRef(0),
    retry = useRef<{ digest: string; id: string } | undefined>(undefined);
  const currentSelection = useRef(selected);
  currentSelection.current = selected;
  useEffect(() => {
    const scope = ++generation.current;
    setReport(undefined);
    setComparison(undefined);
    setSelected("");
    setBaseline("");
    setProfiles([]);
    setConfig(undefined);
    setBusy(false);
    setScenarios([]);
    setError("");
    setNotice("");
    setInference(undefined);
    setInstruction("");
    retry.current = undefined;
    if (!environment || !allowed) return;
    request("/api/agent/scenarios")
      .then((value) => {
        if (scope !== generation.current) return;
        const c = value.configuration as Configuration;
        setConfig(c);
        setScenarios(value.scenarios);
        setProfiles(
          (["budget", "first", "fast"] as const).map((id) => ({
            id,
            name: t(`${id}Name`),
            goal: t(`${id}Goal`),
            budgetMinor: 300 * 10 ** c.scale,
            locale: c.locales.includes(c.mainLocale)
              ? c.mainLocale
              : (c.locales[0] ?? ""),
            country: c.countries[0] ?? "",
          })),
        );
      })
      .catch((e) => {
        if (scope === generation.current) setError(e.message);
      });
    return () => {
      generation.current++;
    };
  }, [request, environment, allowed]);
  useEffect(() => {
    setReport(undefined);
    if (!selected) return;
    let active = true,
      timer: ReturnType<typeof setTimeout>;
    const load = async () => {
      try {
        const value = (await request(
          `/api/agent/scenarios/${encodeURIComponent(selected)}`,
        )) as Report;
        if (!active) return;
        setReport(value);
        if (value.runs.some((r) => ["queued", "running"].includes(r.state)))
          timer = setTimeout(load, 1800);
      } catch (e) {
        if (active) setError((e as Error).message);
      }
    };
    void load();
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [request, selected, refresh]);
  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    setComparison(undefined);
    const load = () =>
      request(`/api/agent/scenarios/${encodeURIComponent(baseline)}`)
        .then((value) => {
          if (!active) return;
          setComparison(value);
          if (
            value.runs.some((r: Run) => ["queued", "running"].includes(r.state))
          )
            timer = setTimeout(load, 1800);
        })
        .catch((e) => {
          if (active) setError(e.message);
        });
    if (baseline) void load();
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [request, baseline]);
  const start = async () => {
    if (busy || !config) return;
    setBusy(true);
    setError("");
    const scope = generation.current;
    const body = {
      title: instruction.trim().slice(0, 80),
      instruction: instruction.trim(),
      profiles,
      ...(inference ? { inference } : {}),
    };
    const digest = JSON.stringify(body);
    if (retry.current?.digest !== digest)
      retry.current = { digest, id: crypto.randomUUID() };
    try {
      const value = await request(
        "/api/agent/scenarios",
        { ...body, requestId: retry.current.id },
        "POST",
      );
      if (scope !== generation.current) return;
      setSelected(value.id);
      setReport(value);
      retry.current = undefined;
      const list = await request("/api/agent/scenarios");
      if (scope === generation.current) setScenarios(list.scenarios);
    } catch (e) {
      if (scope === generation.current) setError((e as Error).message);
    } finally {
      if (scope === generation.current) setBusy(false);
    }
  };
  const control = async (run: Run, action: "cancel" | "resume") => {
    setError("");
    const scope = generation.current;
    try {
      await request(
        `/api/agent/runs/${run.taskId}/${action}`,
        { revision: run.revision, approve: true },
        "POST",
      );
      const value = await request(`/api/agent/scenarios/${selected}`);
      if (
        scope === generation.current &&
        selected === currentSelection.current
      ) {
        setReport(value);
        setRefresh((value) => value + 1);
      }
    } catch (e) {
      if (scope === generation.current && selected === currentSelection.current)
        setError((e as Error).message);
    }
  };
  const repeat = () => {
    const saved = report?.runs
      .map((r) => r.scenario)
      .filter((s) => !!s)
      .sort((a, b) => a.index - b.index);
    if (!saved?.length || !config) return;
    if (
      saved[0].currency !== config.currency ||
      saved[0].channel !== config.channel
    ) {
      setError(t("contextChanged"));
      return;
    }
    setProfiles(saved.map((s) => s.profile));
    setInstruction(saved[0].instruction);
    setInference(saved[0].inference ?? undefined);
    setBaseline(report!.id);
    setNotice(t("repeated"));
  };
  const currentReport = report?.id === selected ? report : undefined;
  const currentComparison =
    comparison?.id === baseline && baseline !== selected
      ? comparison
      : undefined;
  const testLabel = (s: Scenario) =>
    `${s.title} · ${s.updatedAt ? new Date(s.updatedAt).toLocaleString() : s.id.slice(0, 8)}`;
  return (
    <section className="scenario-studio">
      <header className="scenario-intro">
        <span className="scenario-emblem">
          <Icon name="people" size={28} />
        </span>
        <div>
          <h2>{t("title")}</h2>
          <p>{t("intro")}</p>
        </div>
      </header>
      {!allowed ? (
        <p>{t("rights")}</p>
      ) : !environment ? (
        <div className="scenario-empty">
          <p>{t("private")}</p>
          <button
            className="studio-primary"
            onClick={() => selectTab("environments")}
          >
            {t("sandbox")}
          </button>
        </div>
      ) : (
        <>
          {error && (
            <p className="scenario-error" role="alert">
              {error}
            </p>
          )}
          {notice && <p role="status">{notice}</p>}
          <label className="scenario-brief">
            {t("goal")}
            <textarea
              value={instruction}
              maxLength={2000}
              onChange={(e) => setInstruction(e.target.value)}
              rows={3}
            />
          </label>
          {config && (
            <>
              <ScenarioSuggestions
                config={config}
                onApply={setProfiles}
                disabled={busy}
              />
              <ScenarioProfiles
                profiles={profiles}
                config={config}
                onChange={setProfiles}
              />
            </>
          )}
          <footer className="scenario-start">
            <p>{t("boundary")}</p>
            <button
              className="studio-primary"
              disabled={
                busy ||
                !instruction.trim() ||
                !profiles.length ||
                profiles.some(
                  (p) => !p.name.trim() || !p.goal.trim() || p.budgetMinor < 1,
                )
              }
              onClick={() => void start()}
            >
              <Icon name="arrow" />
              {t(busy ? "starting" : "start")}
            </button>
          </footer>
          {!!scenarios.length && (
            <div className="scenario-history">
              <label>
                {t("history")}
                <select
                  value={selected}
                  onChange={(e) => setSelected(e.target.value)}
                >
                  <option value="">{t("history")}</option>
                  {scenarios.map((s) => (
                    <option key={s.id} value={s.id}>
                      {testLabel(s)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                {t("compare")}
                <select
                  value={baseline}
                  onChange={(e) => setBaseline(e.target.value)}
                >
                  <option value="">{t("none")}</option>
                  {scenarios
                    .filter((s) => s.id !== selected)
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {testLabel(s)}
                      </option>
                    ))}
                </select>
              </label>
            </div>
          )}
          {currentReport && (
            <div className="scenario-actions">
              <button className="studio-secondary" onClick={repeat}>
                {t("repeat")}
              </button>
              <button
                className="studio-secondary"
                onClick={() => selectTab("productData")}
              >
                {t("repairProducts")}
              </button>
              {access.includes("settings.read") && (
                <button
                  className="studio-secondary"
                  onClick={() => selectTab("commerce")}
                >
                  {t("repairSettings")}
                </button>
              )}
              <button
                className="studio-secondary"
                onClick={() => selectTab("orders")}
              >
                {t("openOrders")}
              </button>
            </div>
          )}
          {currentComparison && currentReport && (
            <ScenarioComparison
              before={currentComparison}
              after={currentReport}
            />
          )}
          <div className={currentComparison ? "scenario-comparison" : ""}>
            {currentComparison && (
              <div>
                <h3>{t("before")}</h3>
                <ScenarioReport report={currentComparison} />
              </div>
            )}
            <div>
              {currentComparison && <h3>{t("after")}</h3>}
              {currentReport && (
                <ScenarioReport
                  report={currentReport}
                  onControl={(r, a) => void control(r, a)}
                />
              )}
            </div>
          </div>
        </>
      )}
    </section>
  );
}

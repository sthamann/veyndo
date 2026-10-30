/** Private environment creation and digest-bound selective release. */
import { useEffect, useMemo, useRef, useState } from "react";
import ReleaseScenarios from "./ReleaseScenarios";
import { useWorkbenchText } from "../../shared/i18n/workbench-i18n";
import { contentText } from "../../shared/i18n/content-language";
import type { RequestFn } from "../shell/studio-types";
export type Environment = { id: string; name: string };
type Change = {
  key: string;
  before: unknown;
  after: unknown;
  digest: string;
  conflict: boolean;
};
export default function EnvironmentManager({
  request,
  environments,
  onRefresh,
  role,
  rights,
  onSelect,
  initialId,
  sandboxRequest,
  onTest,
}: {
  request: RequestFn;
  environments: Environment[];
  onRefresh: () => Promise<void>;
  role: string;
  rights?: string[];
  onSelect: (id: string) => void;
  initialId?: string;
  sandboxRequest?: (environment: string) => RequestFn;
  onTest?: (
    environment: string,
    channel: string,
    scenario?: string,
  ) => void | Promise<void>;
}) {
  const { w, date, locale } = useWorkbenchText();
  const [mainLocale, setMainLocale] = useState("");
  const [name, setName] = useState("");
  const [id, setId] = useState(
    environments.some((e) => e.id === initialId)
      ? initialId!
      : (environments[0]?.id ?? ""),
  );
  const [changes, setChanges] = useState<Change[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(false);
  const scope = useMemo(() => ({}), [request, id]);
  const currentScope = useRef(scope);
  currentScope.current = scope;
  const [loadedScope, setLoadedScope] = useState<object>();
  const visibleChanges = loadedScope === scope ? changes : [];
  const visibleSelected = loadedScope === scope ? selected : [];
  const [historyRequest, setHistoryRequest] = useState<RequestFn>();
  const [history, setHistory] = useState<
    {
      id: string;
      environment: string;
      selections: string[];
      createdAt: string;
    }[]
  >([]);
  const manage = rights
    ? rights.includes("environments.manage")
    : ["owner", "admin"].includes(role);
  const load = async () => {
    const data = await request("/api/environments");
    if (currentScope.current !== scope) return;
    setHistory(data.releases);
    setHistoryRequest(() => request);
    if (id) {
      const diff = await request(`/api/environments/${id}/diff`);
      if (currentScope.current !== scope) return;
      setChanges(diff.changes);
      setMainLocale(diff.mainLocale ?? "");
      setSelected([]);
      setLoadedScope(scope);
    }
  };
  useEffect(() => {
    let active = true;
    setError("");
    setNotice(false);
    setBusy(false);
    request("/api/environments")
      .then((v) => {
        if (active) {
          setHistory(v.releases);
          setHistoryRequest(() => request);
        }
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    if (id)
      request(`/api/environments/${id}/diff`)
        .then((v) => {
          if (active) {
            setChanges(v.changes);
            setMainLocale(v.mainLocale ?? "");
            setSelected([]);
            setLoadedScope(scope);
          }
        })
        .catch((e) => {
          if (active) setError(e.message);
        });
    return () => {
      active = false;
    };
  }, [request, id, scope]);
  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError("");
    setNotice(false);
    try {
      await fn();
    } catch (e) {
      if (currentScope.current === scope) setError((e as Error).message);
    } finally {
      if (currentScope.current === scope) setBusy(false);
    }
  };
  return (
    <div className="studio-page workbench">
      <div className="page-intro">
        <h1>{w("environments")}</h1>
        <p>{w("stageHint")}</p>
      </div>
      <section className="studio-card">
        <form
          className="workbench-row"
          onSubmit={(e) => {
            e.preventDefault();
            void run(async () => {
              const env = await request("/api/environments", { name });
              await onRefresh();
              if (currentScope.current !== scope) return;
              setId(env.id);
              setName("");
            });
          }}
        >
          <label>
            {w("stageName")}
            <input
              required
              maxLength={80}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <button className="studio-primary" disabled={busy || !manage}>
            {w("newStage")}
          </button>
        </form>
        <p className="muted">{w("exclusion")}</p>
      </section>
      {environments.length > 0 && (
        <section className="studio-card">
          <div className="workbench-row">
            <label>
              {w("stage")}
              <select value={id} onChange={(e) => setId(e.target.value)}>
                <option value="">{w("chooseStage")}</option>
                {environments.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                  </option>
                ))}
              </select>
            </label>
            <button
              className="studio-secondary"
              disabled={!id}
              onClick={() => onSelect(id)}
            >
              {w("stage")}
            </button>
            <a
              className="studio-secondary"
              target="_blank"
              rel="noreferrer"
              href={`/?shop=${id}&sandbox=1#`}
            >
              {w("preview")} ↗
            </a>
            <button
              className="studio-secondary"
              disabled={busy || !id}
              onClick={() => void run(load)}
            >
              {w("changes")}
            </button>
          </div>
          {id && sandboxRequest && onTest && (
            <ReleaseScenarios
              environment={id}
              scope={scope}
              rights={rights ?? []}
              sandboxRequest={sandboxRequest}
              onOpen={onTest}
            />
          )}
          {loadedScope === scope && !visibleChanges.length && (
            <p>{w("noChanges")}</p>
          )}
          {visibleChanges.map((c) => (
            <article className="release-change" key={c.key}>
              <label>
                <input
                  type="checkbox"
                  checked={visibleSelected.includes(c.key)}
                  disabled={c.conflict || busy || !manage}
                  onChange={(e) =>
                    setSelected(
                      e.target.checked
                        ? [...selected, c.key]
                        : selected.filter((k) => k !== c.key),
                    )
                  }
                />
                <strong>{changeTitle(c, locale, mainLocale)}</strong>
              </label>
              {c.conflict && <p role="alert">{w("conflict")}</p>}
              <details>
                <summary>{w("details")}</summary>
                <code>{c.key}</code>
                <div className="diff-columns">
                  <div>
                    <b>{w("before")}</b>
                    <pre>{JSON.stringify(c.before, null, 2)}</pre>
                  </div>
                  <div>
                    <b>{w("after")}</b>
                    <pre>{JSON.stringify(c.after, null, 2)}</pre>
                  </div>
                </div>
              </details>
            </article>
          ))}
          <button
            className="studio-primary"
            disabled={!visibleSelected.length || busy || !manage}
            onClick={() =>
              void run(async () => {
                await request(`/api/environments/${id}/release`, {
                  approve: true,
                  selections: visibleChanges
                    .filter((c) => visibleSelected.includes(c.key))
                    .map((c) => ({ key: c.key, digest: c.digest })),
                });
                await load();
                if (currentScope.current === scope) setNotice(true);
              })
            }
          >
            {w("release")} · {visibleSelected.length}
          </button>
        </section>
      )}
      {notice && <p role="status">{w("released")}</p>}
      {error && <p role="alert">{error}</p>}
      <section className="studio-card">
        <h2>{w("history")}</h2>
        {(historyRequest === request ? history : []).map((r) => (
          <p key={r.id}>
            {date(r.createdAt)} · {r.selections.join(", ")}
          </p>
        ))}
      </section>
    </div>
  );
}

function changeTitle(change: Change, language: string, mainLocale: string) {
  if (!change.key.startsWith("product:")) return change.key;
  const value = change.after ?? change.before;
  if (!value || typeof value !== "object" || !("name" in value))
    return change.key;
  if (typeof value.name === "string") return value.name || change.key;
  if (!value.name || typeof value.name !== "object") return change.key;
  const names = Object.fromEntries(
    Object.entries(value.name).filter(([, name]) => typeof name === "string"),
  );
  return contentText(names, language, mainLocale) || change.key;
}

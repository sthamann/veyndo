/** Coarse work plans use existing versioned native app records; source rows and job authority stay with their original owners. */
import { useEffect, useRef, useState } from "react";
import type { RequestFn } from "../../../../frontend/src/shared/api/types";
import { useLocale } from "../../../../frontend/src/shared/i18n/i18n";
import { contentText } from "../../../../frontend/src/shared/i18n/content-language";
import LocalizedField from "../../../../frontend/src/shared/i18n/LocalizedField";
import type { Kind } from "./model";
import { useRunText } from "./run-i18n";
import { useMigrationText } from "./i18n";
import { domains, readRunPlan, type RunPlan } from "./run-model";
export type { RunPlan } from "./run-model";
export default function RunPlans({
  request,
  mainLocale,
  sourceId,
  target,
  selected,
  busy,
  onSelect,
  onError,
}: {
  request: RequestFn;
  mainLocale: string;
  sourceId: string;
  target?: string;
  selected?: RunPlan;
  busy: boolean;
  onSelect: (plan?: RunPlan) => void;
  onError: (message: string) => void;
}) {
  const current = useRef(request);
  current.current = request;
  const t = useRunText(),
    m = useMigrationText(),
    { locale } = useLocale();
  const [editing, setEditing] = useState(false);
  const [plans, setPlans] = useState<RunPlan[]>([]),
    [title, setTitle] = useState<Record<string, string>>({}),
    [areas, setAreas] = useState<Kind[]>([...domains]),
    [saving, setSaving] = useState(false),
    [after, setAfter] = useState<string>();
  const decode = (value: unknown) => {
    const rows = Array.isArray(value) ? value : [];
    const valid = rows.map(readRunPlan).filter((p): p is RunPlan => !!p);
    if (!Array.isArray(value) || valid.length !== rows.length)
      onError(t("invalid"));
    return valid;
  };
  useEffect(() => {
    let active = true;
    setSaving(false);
    setPlans([]);
    setAfter(undefined);
    setTitle({});
    void request("/api/apps/migration/actions/list_runs", { limit: 30 })
      .then((v) => {
        if (active) {
          setPlans(decode(v.elements ?? []));
          setAfter(v.nextCursor ?? undefined);
        }
      })
      .catch((e) => {
        if (active) onError(e.message);
      });
    return () => {
      active = false;
    };
  }, [request]);
  useEffect(() => {
    if (selected)
      setPlans((old) => old.map((p) => (p.id === selected.id ? selected : p)));
  }, [selected]);
  return (
    <section className="studio-card migration-run-plans">
      <h2>{t("plans")}</h2>
      <p>{t("notice")}</p>
      <div className="migration-run-picker">
        <button
          disabled={busy || saving}
          aria-pressed={!selected}
          onClick={() => onSelect(undefined)}
        >
          {t("all")}
        </button>
        {plans.map((plan) => (
          <button
            key={plan.id}
            aria-pressed={plan.id === selected?.id}
            disabled={busy || saving}
            onClick={() => onSelect(plan)}
          >
            {contentText(plan.title, locale, mainLocale) || plan.id}
          </button>
        ))}
        {after && (
          <button
            disabled={saving || busy}
            onClick={async () => {
              setSaving(true);
              try {
                const v = await request(
                  "/api/apps/migration/actions/list_runs",
                  { limit: 30, after },
                );
                if (current.current !== request) return;
                setPlans((old) => [...old, ...decode(v.elements)]);
                setAfter(v.nextCursor ?? undefined);
              } catch (e) {
                if (current.current === request) onError((e as Error).message);
              } finally {
                if (current.current === request) setSaving(false);
              }
            }}
          >
            {t("morePlans")}
          </button>
        )}
      </div>
      <details onToggle={(e) => setEditing(e.currentTarget.open)}>
        <summary>{t("create")}</summary>
        {editing && (
          <>
            <LocalizedField
              label={t("name")}
              value={title}
              onChange={(value) =>
                setTitle(
                  Object.fromEntries(
                    Object.entries(value).filter(
                      (entry): entry is [string, string] =>
                        typeof entry[1] === "string",
                    ),
                  ),
                )
              }
              maxLength={100}
            />
            <fieldset>
              <legend>{t("areas")}</legend>
              <div className="migration-run-areas">
                {domains.map((kind) => (
                  <label key={kind}>
                    <input
                      type="checkbox"
                      checked={areas.includes(kind)}
                      onChange={(e) =>
                        setAreas((old) =>
                          e.target.checked
                            ? [...old, kind]
                            : old.filter((k) => k !== kind),
                        )
                      }
                    />
                    {m(kind)}
                  </label>
                ))}
              </div>
            </fieldset>
            <button
              className="studio-primary"
              disabled={
                busy ||
                saving ||
                !title[mainLocale]?.trim() ||
                !sourceId.trim() ||
                !areas.length
              }
              onClick={async () => {
                setSaving(true);
                const id = crypto.randomUUID();
                try {
                  const fields = {
                    title,
                    source_id: sourceId,
                    domains: areas,
                    ...(target ? { target } : {}),
                  };
                  const saved = await request(
                    "/api/apps/migration/actions/save_run",
                    { id, revision: 0, fields },
                  );
                  if (current.current !== request) return;
                  const plan = { ...fields, id, revision: saved.revision };
                  setPlans((old) => [plan, ...old]);
                  setTitle({});
                  onSelect(plan);
                } catch (e) {
                  if (current.current === request)
                    onError((e as Error).message);
                } finally {
                  if (current.current === request) setSaving(false);
                }
              }}
            >
              {t("create")}
            </button>
          </>
        )}
      </details>
    </section>
  );
}

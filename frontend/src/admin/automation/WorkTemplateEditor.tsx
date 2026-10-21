/** Bounded field-to-event mapping over the original native operations, never a second executor. */
import { useEffect, useState } from "react";
import {
  scalarFields,
  type WorkTemplate,
  type WorkStep,
} from "./work-template";
import type { RequestFn } from "../shell/studio-types";
import { useWorkTemplateText } from "./work-template-i18n";
export default function WorkTemplateEditor({
  value,
  onChange,
  request,
}: {
  request?: RequestFn;
  value?: WorkTemplate;
  onChange: (v: WorkTemplate) => void;
}) {
  const t = useWorkTemplateText();
  const [selected, setSelected] = useState<Record<number, string>>({});
  const [loaded, setLoaded] = useState<{
    id: string;
    request: RequestFn;
    steps?: WorkStep[];
    error?: boolean;
  }>();
  const taskId = value?.taskId;
  useEffect(() => {
    if (!request || !taskId) return;
    let active = true;
    void request(`/api/agent/runs/${encodeURIComponent(taskId)}`)
      .then((run) => {
        const steps =
          run.state === "ready" &&
          run.approvalRequired === false &&
          run.execution?.total > 0 &&
          run.execution.completed === run.execution.total
            ? run.preview?.proposal?.operations
            : undefined;
        if (active)
          setLoaded({
            id: taskId,
            request,
            steps,
            error: !Array.isArray(steps) || !steps.length,
          });
      })
      .catch(() => {
        if (active) setLoaded({ id: taskId, request, error: true });
      });
    return () => {
      active = false;
    };
  }, [taskId, request]);
  if (!value) return <p>{t("empty")}</p>;
  const current =
    loaded && loaded.id === taskId && loaded.request === request
      ? loaded
      : undefined;
  if (!request || current?.error) return <p role="alert">{t("unavailable")}</p>;
  if (!current?.steps) return <p role="status">{t("loading")}</p>;
  const steps = current.steps;
  return (
    <section className="work-template-editor">
      <h3>{t("title")}</h3>
      <p>{t("hint")}</p>
      <label>
        {t("limit")}
        <input
          type="number"
          min={1}
          max={100}
          required
          value={value.dailyLimit}
          onChange={(e) =>
            onChange({ ...value, dailyLimit: Number(e.target.value) })
          }
        />
      </label>
      {steps.map((step, index) => {
        let args: unknown;
        try {
          args = JSON.parse(step.arguments_json);
        } catch {
          args = {};
        }
        const fields = scalarFields(args);
        const pointer = selected[index] ?? fields[0]?.pointer ?? "";
        const binding = value.bindings.find(
          (b) => b.step === index && b.pointer === pointer,
        );
        const source = binding?.source ?? "";
        return (
          <article className="studio-card" key={index}>
            <strong>
              {index + 1}. {step.label}
            </strong>
            <p>
              <code>{step.name}</code>
            </p>
            <div className="connector-settings">
              <label>
                {t("field")}
                <select
                  value={pointer}
                  onChange={(e) =>
                    setSelected({ ...selected, [index]: e.target.value })
                  }
                >
                  {fields.map((f) => (
                    <option key={f.pointer} value={f.pointer}>
                      {f.pointer}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                {t("source")}
                <select
                  value={source}
                  onChange={(e) =>
                    onChange({
                      ...value,
                      bindings: [
                        ...value.bindings.filter(
                          (b) => b.step !== index || b.pointer !== pointer,
                        ),
                        ...(e.target.value
                          ? [{ step: index, pointer, source: e.target.value }]
                          : []),
                      ],
                    })
                  }
                >
                  <option value="">{t("fixed")}</option>
                  {typeof fields.find((f) => f.pointer === pointer)?.value ===
                    "string" && (
                    <>
                      <option value="event.productId">{t("product")}</option>

                      <option value="event.orderId">{t("order")}</option>
                      <option value="event.documentId">{t("document")}</option>
                      {steps.map((_, i) => (
                        <option key={i} value={`run.key:step_${i}`}>
                          {t("generated")} · {i + 1}
                        </option>
                      ))}
                    </>
                  )}
                  {typeof fields.find((f) => f.pointer === pointer)?.value ===
                    "number" && (
                    <option value="event.revision">{t("revision")}</option>
                  )}
                </select>
              </label>
            </div>
            <p>
              <code>
                {String(fields.find((f) => f.pointer === pointer)?.value ?? "")}
              </code>
            </p>
            <details>
              <summary>{t("exact")}</summary>
              <pre>{JSON.stringify(args, null, 2)}</pre>
            </details>
          </article>
        );
      })}
      <p className="muted">{t("revisions")}</p>
    </section>
  );
}

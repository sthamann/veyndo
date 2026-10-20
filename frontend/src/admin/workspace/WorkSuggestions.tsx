/** Actual permission-filtered work links open native owners; late responses cannot survive a scope change. */
import { useEffect, useState } from "react";
import { useStudio } from "../shell/StudioContext";
import { useAgentWorkspaceText } from "../../shared/i18n/agent-workspace-i18n";
import Icon from "../../shared/ui/Icon";
type Item = {
  id: string;
  kind: "stock" | "run" | "translation" | "app";
  entity?: string;
  runId?: string;
  translationJob?: string;
  app?: string;
};
export default function WorkSuggestions() {
  const { request, openEntity, selectTab, load, intent } = useStudio(),
    t = useAgentWorkspaceText();
  const [items, setItems] = useState<Item[]>([]),
    [error, setError] = useState(false),
    [reload, setReload] = useState(0);
  useEffect(() => {
    let active = true;
    setItems([]);
    setError(false);
    request("/api/studio/work")
      .then((v) => {
        if (active) setItems(Array.isArray(v.items) ? v.items : []);
      })
      .catch(() => {
        if (active) setError(true);
      });
    return () => {
      active = false;
    };
  }, [request, reload]);
  const open = async (item: Item) => {
    if (item.kind === "stock" && item.entity)
      openEntity("productData", item.entity);
    else if (item.kind === "translation") {
      const url = new URL(location.href);
      url.searchParams.set("settings", "languages");
      url.searchParams.set("translationJob", item.translationJob ?? "");
      history.replaceState(null, "", url);
      selectTab("commerce");
    } else if (item.kind === "run") {
      try {
        const run = await request(`/api/agent/runs/${item.runId}`);
        if (run.conversationId) await load(run.conversationId);
        selectTab("assistant");
      } catch {
        setError(true);
      }
    } else intent(`${t("app")}: ${item.app}`);
  };
  return (
    <section className="personal-goals studio-card">
      <h2>
        <Icon name="spark" />
        {t("work")}
      </h2>
      <p>{t("hint")}</p>
      <button
        className="studio-secondary"
        onClick={() => setReload((n) => n + 1)}
      >
        {t("reload")}
      </button>
      {error ? (
        <p role="alert">{t("error")}</p>
      ) : !items.length ? (
        <p>{t("empty")}</p>
      ) : (
        <div className="personal-cards">
          {items.map((item) => (
            <button
              type="button"
              className="studio-secondary"
              key={item.id}
              onClick={() => void open(item)}
            >
              <Icon name={item.kind === "stock" ? "box" : "pulse"} />
              {t(item.kind)}
              {item.entity && <small>{item.entity}</small>}
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

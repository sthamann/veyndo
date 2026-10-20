/** One visible setup path reuses native sandbox admission and explicit per-package consent. */
import { useEffect, useRef, useState } from "react";
import type { RequestFn } from "../../../../frontend/src/shared/api/types";
import AppConsent from "../../../../frontend/src/admin/apps/AppConsent";
import Icon from "../../../../frontend/src/shared/ui/Icon";
import { useSetupText } from "./setup-i18n";
import "./setup.css";
export type DesignIntent = "edit" | "agent" | "blocks" | "hero" | "products";
const intents = ["edit", "agent", "blocks", "hero", "products"];
export function designIntent(): DesignIntent | undefined {
  const value = new URLSearchParams(location.search).get("designIntent");
  return intents.includes(value ?? "") ? (value as DesignIntent) : undefined;
}
export default function DesignSetup({
  request,
  workspace,
  rights,
  sandbox,
  installed,
  loaded,
  onSandbox,
  onReload,
}: {
  request: RequestFn;
  workspace: string;
  rights: string[];
  sandbox: boolean;
  installed: string[];
  loaded: boolean;
  onSandbox?: (id: string) => Promise<void>;
  onReload: () => Promise<void>;
}) {
  const t = useSetupText(),
    current = useRef(request);
  current.current = request;
  const [environments, setEnvironments] = useState<
      { id: string; name: string }[]
    >([]),
    [selected, setSelected] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [consent, setConsent] = useState(false);
  const missing = ["site_builder", "site_forms"].find(
    (id) => !installed.includes(id),
  );
  useEffect(() => {
    let active = true;
    setSelected("");
    setEnvironments([]);
    setError("");
    setBusy(false);
    setConsent(false);
    if (!sandbox && rights.includes("environments.read"))
      void request("/api/environments")
        .then((value) => {
          if (active) setEnvironments(value.environments ?? []);
        })
        .catch((e) => {
          if (active) setError(e.message);
        });
    return () => {
      active = false;
    };
  }, [request, workspace, sandbox, rights.includes("environments.read")]);
  if (sandbox && !missing && rights.includes("channels.manage")) return null;
  const channel = rights.includes("channels.manage"),
    apps = rights.includes("apps.manage");
  const denied = !channel
    ? t("channelDenied")
    : sandbox && !apps
      ? t("appDenied")
      : !sandbox && !onSandbox
        ? t("unavailable")
        : !sandbox && !selected && !rights.includes("environments.manage")
          ? t("environmentDenied")
          : "";
  return (
    <section className="designer-start" aria-label={t("title")} tabIndex={-1}>
      <Icon name="palette" size={28} />
      <h2>{t("title")}</h2>
      <p>{t("hint")}</p>
      <ol>
        {(["private", "tools", "continue"] as const).map((key, i) => (
          <li
            key={key}
            data-complete={i === 0 ? sandbox : i === 1 ? !missing : false}
          >
            <span>
              {(i === 0 && sandbox) || (i === 1 && !missing) ? (
                <Icon name="check" size={14} />
              ) : (
                i + 1
              )}
            </span>
            {t(key)}
          </li>
        ))}
      </ol>
      {!sandbox && rights.includes("environments.read") && (
        <label>
          {t("private")}
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            disabled={busy}
          >
            <option value="">{t("new")}</option>
            {environments.map((env) => (
              <option key={env.id} value={env.id}>
                {env.name}
              </option>
            ))}
          </select>
        </label>
      )}
      <p className="designer-start-note">
        {sandbox ? t("packageHint") : t("safe")}
      </p>
      {denied ? (
        <p role="status">{denied}</p>
      ) : (
        <button
          className="studio-primary"
          disabled={busy || !loaded}
          onClick={async () => {
            if (!designIntent()) {
              const url = new URL(location.href);
              url.searchParams.set("designIntent", "edit");
              history.replaceState(null, "", url);
            }
            if (sandbox) {
              setConsent(true);
              return;
            }
            setBusy(true);
            setError("");
            try {
              const id =
                selected ||
                (await request("/api/environments", { name: t("private") })).id;
              if (current.current !== request) return;
              const url = new URL(location.href);
              url.searchParams.set("designIntentTarget", id);
              history.replaceState(null, "", url);
              await onSandbox!(id);
            } catch (e) {
              if (current.current === request) setError((e as Error).message);
            } finally {
              if (current.current === request) setBusy(false);
            }
          }}
        >
          {t(busy ? "busy" : sandbox ? "review" : selected ? "open" : "create")}
        </button>
      )}
      {error && <p role="alert">{error}</p>}
      {consent && sandbox && missing && channel && apps && (
        <AppConsent
          key={`${workspace}:${missing}`}
          app={missing}
          request={request}
          onCancel={() => setConsent(false)}
          onInstall={async (approved) => {
            await request("/api/apps", approved);
            if (current.current !== request) return;
            await onReload();
            if (current.current === request)
              window.dispatchEvent(new Event("commerce.apps.changed"));
          }}
        />
      )}
    </section>
  );
}

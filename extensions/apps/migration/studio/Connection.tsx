/** Source credentials are edited in memory and saved through the existing encrypted installed-settings owner. */
import { useEffect, useState } from "react";
import type { RequestFn } from "../../../../frontend/src/shared/api/types";
import ExportFields from "./ExportFields";
import LanguageMap from "./LanguageMap";
import { useMigrationText } from "./i18n";
const sources = [
  "shopify",
  "woocommerce",
  "prestashop",
  "magento2",
  "shopware5",
] as const;
export default function Connection({ request }: { request: RequestFn }) {
  const t = useMigrationText();
  const [values, setValues] = useState<
      Record<string, string | number | boolean>
    >({
      system: "shopify",
      origin: "",
      version: "",
      token: "",
      username: "",
      currency: "EUR",
      scale: 2,
      locale: "en-GB",
      language_map: "{}",
      timezone: "",
    }),
    [binding, setBinding] = useState<{
      revision: number;
      digest: string;
      canManage: boolean;
      encryptionReady: boolean;
    }>(),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [saved, setSaved] = useState(false);
  useEffect(() => {
    let active = true;
    void request("/api/apps/migration/settings")
      .then((v) => {
        if (active) {
          setBinding(v);
          setValues((old) => {
            const next = { ...old, ...v.values, token: "", export_token: "" };
            if (!next.export_manifest) delete next.export_manifest;
            return next;
          });
        }
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [request]);
  return (
    <form
      className="migration-connection"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!binding) return;
        setBusy(true);
        setError("");
        setSaved(false);
        try {
          const input = { ...values };
          if (!input.token) delete input.token;
          if (!input.export_token) delete input.export_token;
          if (input.export_manifest === undefined) {
            input.export_manifest = "";
            input.export_digest = "";
            input.export_public = false;
          }
          const result = await request(
            "/api/apps/migration/settings",
            {
              revision: binding.revision,
              digest: binding.digest,
              approve: true,
              values: input,
            },
            "PUT",
          );
          setBinding({ ...binding, revision: result.revision });
          setValues((v) => ({ ...v, token: "", export_token: "" }));
          setSaved(true);
        } catch (e) {
          setError((e as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <p>{t("noSecrets")}</p>
      <fieldset
        disabled={busy || !binding?.canManage || !binding.encryptionReady}
      >
        <legend>{t("system")}</legend>
        <div className="migration-sources">
          {sources.map((s) => (
            <button
              type="button"
              key={s}
              aria-pressed={values.system === s}
              onClick={() =>
                setValues((v) => ({
                  ...v,
                  system: s,
                  version: s === "woocommerce" ? "wc/v3" : "",
                }))
              }
            >
              {s}
            </button>
          ))}
        </div>
        <div className="migration-fields">
          {(
            [
              "origin",
              "version",
              "username",
              "token",
              "currency",
              "scale",
              "locale",
              "timezone",
            ] as const
          ).map((key) => (
            <label key={key}>
              {t(key)}
              <input
                type={
                  key === "token"
                    ? "password"
                    : key === "scale"
                      ? "number"
                      : key === "origin"
                        ? "url"
                        : "text"
                }
                autoComplete="off"
                value={String(values[key] ?? "")}
                required={!["username", "token", "timezone"].includes(key)}
                maxLength={key === "token" ? 4096 : 200}
                min={key === "scale" ? 0 : undefined}
                max={key === "scale" ? 6 : undefined}
                onChange={(e) =>
                  setValues((v) => ({
                    ...v,
                    [key]:
                      key === "scale" ? Number(e.target.value) : e.target.value,
                  }))
                }
              />
            </label>
          ))}
        </div>
        <ExportFields values={values} onChange={setValues} />
        {values.system === "prestashop" && (
          <LanguageMap
            value={String(values.language_map ?? "{}")}
            onChange={(language_map) =>
              setValues((v) => ({ ...v, language_map }))
            }
          />
        )}
        <button className="studio-primary" type="submit">
          {t(busy ? "busy" : "save")}
        </button>
      </fieldset>
      {saved && <p role="status">{t("saved")}</p>}
      {error && <p role="alert">{error}</p>}
    </form>
  );
}

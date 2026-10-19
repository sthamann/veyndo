/** Optional immutable export settings reuse the existing encrypted app-settings form and separate credential. */
import { useExportText } from "./export-i18n";
export default function ExportFields({
  values,
  onChange,
}: {
  values: Record<string, string | number | boolean>;
  onChange: (next: Record<string, string | number | boolean>) => void;
}) {
  const t = useExportText();
  const active = values.export_manifest !== undefined;
  return (
    <fieldset>
      <label>
        <input
          type="checkbox"
          checked={active}
          onChange={(e) => {
            const next: Record<string, string | number | boolean> = {
              ...values,
              export_digest: "",
              export_token: "",
            };
            if (e.target.checked) next.export_manifest = "";
            else delete next.export_manifest;
            onChange(next);
          }}
        />
        {t("mode")}
      </label>
      {active && (
        <>
          <p>{t("hint")}</p>
          <label>
            <input
              type="checkbox"
              checked={values.export_public === true}
              onChange={(e) =>
                onChange({ ...values, export_public: e.target.checked })
              }
            />
            {t("public")}
          </label>
          <p>{t("publicHint")}</p>
          <div className="migration-fields">
            <label>
              {t("url")}
              <input
                type="url"
                required
                value={String(values.export_manifest ?? "")}
                maxLength={2000}
                onChange={(e) =>
                  onChange({ ...values, export_manifest: e.target.value })
                }
              />
            </label>
            <label>
              {t("hash")}
              <input
                required
                value={String(values.export_digest ?? "")}
                pattern="[a-f0-9]{64}"
                maxLength={64}
                onChange={(e) =>
                  onChange({ ...values, export_digest: e.target.value })
                }
              />
            </label>
            {!values.export_public && (
              <label>
                {t("credential")}
                <input
                  type="password"
                  autoComplete="new-password"
                  value={String(values.export_token ?? "")}
                  maxLength={8192}
                  onChange={(e) =>
                    onChange({ ...values, export_token: e.target.value })
                  }
                />
              </label>
            )}
          </div>
        </>
      )}
    </fieldset>
  );
}

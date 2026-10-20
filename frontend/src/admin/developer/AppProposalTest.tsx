/** Proposed versions run in the existing actor-private native preview; diagnostic repair returns to the same composer. */
import { useMemo, useState } from "react";
import type { Build } from "./useAppStudio";
import type { RequestFn } from "../shell/studio-types";
import { useAppPreview } from "./useAppPreview";
import { useBuildingText } from "../../shared/i18n/app-building-i18n";
import { contentText } from "../../shared/i18n/content-language";
import { useLocale } from "../../shared/i18n/i18n";
import SandboxPreview from "./SandboxPreview";
export default function AppProposalTest({
  build,
  request,
  sandboxRequest,
  onRepair,
}: {
  build: Build;
  request: RequestFn;
  sandboxRequest: (environment: string) => RequestFn;
  onRepair: (prompt: string) => void;
}) {
  const preview = useAppPreview(build.manifest, request),
    t = useBuildingText(),
    { locale } = useLocale();
  const [selected, setSelected] = useState(
    build.manifest.surfaces?.[0]?.id ?? "",
  );
  const scoped = useMemo(
    () => sandboxRequest(preview.result?.environment ?? build.environment),
    [sandboxRequest, preview.result?.environment, build.environment],
  );
  return (
    <section className="app-model-card">
      <button
        type="button"
        className="studio-secondary"
        disabled={preview.busy}
        onClick={() => void preview.run()}
      >
        {t("testProposal")}
      </button>
      {preview.error && (
        <div role="alert">
          <p>{preview.error}</p>
          <button
            type="button"
            onClick={() =>
              onRepair(`${t("validationPrompt")}\n${preview.error}`)
            }
          >
            {t("validationIdea")}
          </button>
        </div>
      )}
      {preview.active && preview.result && (
        <>
          <select
            aria-label={t("surfaces")}
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
          >
            {build.manifest.surfaces?.map((s) => (
              <option key={s.id} value={s.id}>
                {contentText(s.label, locale, "en-GB") || s.id}
              </option>
            ))}
          </select>
          <SandboxPreview
            key={`${preview.result.digest}:${selected}`}
            app={build.app}
            version={build.version}
            view={selected}
            request={scoped}
          />
        </>
      )}
    </section>
  );
}

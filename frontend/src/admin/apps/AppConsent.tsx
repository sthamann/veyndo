/** Review the actual package and permission changes before installation; consent is enforced by the API. */
import { useEffect, useState } from "react";
import type { RequestFn } from "../shell/studio-types";
import ConfirmDialog from "../../shared/ui/ConfirmDialog";
import { useAppAccessText } from "../../shared/i18n/app-access-i18n";
import { contentText } from "../../shared/i18n/content-language";
import { useAppText } from "../../shared/i18n/app-i18n";
import AppUpgradeReport, { type UpgradeReport } from "./AppUpgradeReport";
type Review = {
  app: string;
  name: Record<string, string>;
  version: string;
  digest: string;
  permissions: string[];
  added: string[];
  previousVersion: string | null;
  upgrade?: UpgradeReport;
};
export default function AppConsent({
  app,
  request,
  onCancel,
  onInstall,
}: {
  app: string;
  request: RequestFn;
  onCancel: () => void;
  onInstall: (
    consent: Review & { approve: true; builtIn: string },
  ) => Promise<void>;
}) {
  const t = useAppAccessText(),
    { a, locale } = useAppText();
  const [result, setResult] = useState<{
      app: string;
      request: RequestFn;
      review: Review;
    } | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const review =
    result?.app === app && result.request === request ? result.review : null;
  useEffect(() => {
    let active = true;
    request("/api/apps/review", { builtIn: app })
      .then((v) => {
        if (active) setResult({ app, request, review: v });
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [app, request]);
  return (
    <ConfirmDialog
      title={t("installConsent")}
      confirmLabel={a(review?.previousVersion ? "upgrade" : "install")}
      disabled={!review || busy || review.upgrade?.ready === false}
      onCancel={onCancel}
      onConfirm={async () => {
        if (!review || review.upgrade?.ready === false) return;
        setBusy(true);
        setError("");
        try {
          await onInstall({ ...review, approve: true, builtIn: app });
        } catch (e) {
          setError((e as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <p>{t("installHint")}</p>
      {review && (
        <>
          <strong>
            {contentText(review.name, locale, "en-GB")} · {review.version}
          </strong>
          <code className="app-key-secret">{review.digest}</code>
          {review.upgrade && <AppUpgradeReport report={review.upgrade} />}
          <ul>
            {review.permissions.map((p) => (
              <li key={p}>
                <code>{p}</code>
                {review.added.includes(p) && (
                  <span className="soft-tag">{t("added")}</span>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
      {error && <p role="alert">{error}</p>}
    </ConfirmDialog>
  );
}

/** App-owned inward migration workflow: native consent, exact reviewed pages, private product targets and durable jobs. */
import { useEffect, useRef, useState } from "react";
import type { RequestFn } from "../../../../frontend/src/shared/api/types";
import InstallConsent from "./InstallConsent";
import Icon from "../../../../frontend/src/shared/ui/Icon";
import Connection from "./Connection";
import JobHistory from "./JobHistory";
import RunProgress from "./RunProgress";
import useRunPages from "./useRunPages";
import useMigrationImport from "./useMigrationImport";
import RunPlans, { type RunPlan } from "./RunPlans";
import useJobPages from "./useJobPages";
import useMigrationPackages from "./useMigrationPackages";
import useCustomerGroups from "./useCustomerGroups";
import useMigrationDesign from "./useMigrationDesign";
import Target from "./Target";
import SourceProfile from "./SourceProfile";
import MigrationSteps from "./MigrationSteps";
import ReviewPanel from "./ReviewPanel";
import Agent from "./Agent";
import useSourceReview from "./useSourceReview";
import { useMigrationText } from "./i18n";
import {
  isPrivate,
  importRights,
  reviewPriceBasis,
  type Kind,
  type Review,
} from "./model";
import "./migration.css";
export default function MigrationWorkspace({
  request,
  workspace,
  rights,
  mainLocale,
  onBack,
  onDesign,
}: {
  request: RequestFn;
  workspace: string;
  rights: string[];
  mainLocale: string;
  onBack: () => void;
  onDesign?: (target: string, reference?: string) => void | Promise<void>;
}) {
  const t = useMigrationText(),
    current = useRef(request);
  current.current = request;
  const [install, setInstall] = useState<string>(),
    [settings, setSettings] = useState(false),
    [agent, setAgent] = useState(false),
    [kind, setKind] = useState<Kind>("products"),
    [sourceId, setSourceId] = useState("installed"),
    [review, setReview] = useState<Review>(),
    [cursor, setCursor] = useState<string>(),
    [target, setTarget] = useState<string>(),
    [approved, setApproved] = useState(false),
    [tax, setTax] = useState(""),
    [priceBasis, setPriceBasis] = useState(""),
    [group, setGroup] = useState(""),
    [plan, setPlan] = useState<RunPlan>(),
    [working, setBusy] = useState(false),
    [error, setError] = useState("");
  const accessKey = [...rights].sort().join("|");
  const canRead = rights.includes("apps.read"),
    canManage = rights.includes("apps.manage"),
    canImport = importRights(kind).every((p) => rights.includes(p));
  const { app, designerPackage, load } = useMigrationPackages(
    request,
    canRead,
    setError,
  );
  useEffect(() => {
    setReview(undefined);
    setTarget(undefined);
    setError("");
    setPlan(undefined);
    setBusy(false);
  }, [request, canRead, accessKey]);
  const { jobs, refresh, hasMore, more } = useJobPages(
    request,
    !!app?.active && canManage,
    plan?.id,
    setError,
    accessKey,
  );
  const runPages = useRunPages(
    request,
    plan?.id,
    accessKey,
    !!app?.active && canManage,
    setError,
  );
  const activeRun = jobs.some((j) =>
    ["queued", "running", "cancel_requested"].includes(j.status),
  );
  const groups = useCustomerGroups(
    request,
    kind === "customers" &&
      rights.includes("customers.write") &&
      rights.includes("customers.pii"),
    setError,
  );
  const adoptReview = (value?: Review) => {
    setPriceBasis("");
    setReview(value);
    setApproved(false);
    setCursor(value?.cursor);
  };
  const { inspect, inspecting } = useSourceReview({
    request,
    jobs,
    kind,
    sourceId,
    jobGroup: plan?.id,
    accessKey,
    onReview: adoptReview,
    onError: setError,
  });
  const busy = working || inspecting;
  const sourcePriceBasis = priceBasis || reviewPriceBasis(review) || "";
  const { start, resumePage } = useMigrationImport({
    request,
    workspace,
    accessKey,
    kind,
    sourceId,
    mainLocale,
    review,
    plan,
    target,
    tax,
    sourcePriceBasis,
    group,
    cursor,
    canImport,
    approved,
    destinationDigest: designerPackage?.active
      ? designerPackage.digest
      : undefined,
    name: t("title"),
    setBusy,
    setError,
    setTarget,
    setPlan,
    setApproved,
    refresh: () => {
      refresh();
      runPages.refresh();
    },
  });

  const design = useMigrationDesign({
    request,
    target,
    onDesign,
    reference: review?.records[0]?.sourceShop,
    setTarget,
    setBusy,
    setError,
    name: t("title"),
  });
  const agentContext = { kind, review, plan };
  return (
    <div className="studio-page migration-workspace">
      <header className="page-intro">
        <button className="studio-secondary" onClick={onBack}>
          ← {t("back")}
        </button>
        <h1>{t("title")}</h1>
        <p>{t("intro")}</p>
        {rights.includes("assistant.use") && (
          <button className="studio-secondary" onClick={() => setAgent(true)}>
            <Icon name="spark" />
            {t("agent")}
          </button>
        )}
      </header>
      {!canRead ? (
        <p role="alert">{t("denied")}</p>
      ) : !app?.active ? (
        <section className="studio-card">
          <p>{t("private")}</p>
          <button
            className="studio-primary"
            disabled={!canManage || busy}
            onClick={async () => {
              if (!app) {
                setInstall("migration");
                return;
              }
              setBusy(true);
              try {
                await request(
                  "/api/apps/migration",
                  { active: true, revision: app.revision },
                  "PUT",
                );
                await load();
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            {t("install")}
          </button>
        </section>
      ) : (
        <div className="migration-layout">
          <MigrationSteps
            rights={rights}
            kind={kind}
            busy={busy}
            onSettings={() => setSettings(!settings)}
            onKind={(value) => {
              setKind(value);
              setReview(undefined);
              setApproved(false);
              setCursor(undefined);
            }}
            onDesign={design}
          />
          <main>
            {canManage && (
              <RunPlans
                request={request}
                mainLocale={mainLocale}
                sourceId={sourceId}
                target={target}
                selected={plan}
                busy={busy}
                onError={setError}
                onSelect={(value) => {
                  setPlan(value);
                  setReview(undefined);
                  setApproved(false);
                  setCursor(undefined);
                  if (value) {
                    setSourceId(value.source_id);
                    setTarget(value.target);
                    if (value.domains.length) setKind(value.domains[0]);
                  }
                }}
              />
            )}

            {plan && (
              <RunProgress
                plan={plan}
                pages={runPages.pages}
                hasMore={runPages.more}
                loadMore={runPages.loadMore}
                busy={busy}
                active={activeRun}
                onNext={(next, cursor) => {
                  setKind(next);
                  void inspect(cursor, next, plan.source_id);
                }}
                onRun={(page, op) => void resumePage(page, op)}
              />
            )}
            {settings && (
              <section className="studio-card">
                <h2>{t("connection")}</h2>
                <Connection request={request} />
              </section>
            )}
            <section className="studio-card">
              <h2>{t("review")}</h2>
              <p>{t("reviewNotice")}</p>
              {kind === "pages" && !designerPackage?.active && (
                <button
                  className="studio-secondary"
                  disabled={!canManage}
                  onClick={() => setInstall("site_builder")}
                >
                  {t("connectDesigner")}
                </button>
              )}
              {isPrivate(kind) && (
                <Target
                  request={request}
                  read={rights.includes("environments.read")}
                  value={target}
                  onChange={(v) => {
                    setTarget(v);
                    setPlan(undefined);
                    setApproved(false);
                  }}
                  onError={setError}
                />
              )}
              <SourceProfile
                value={sourceId}
                onChange={(value) => {
                  setSourceId(value);
                  setPlan(undefined);
                  setReview(undefined);
                  setApproved(false);
                }}
              />

              <button
                className="studio-primary"
                disabled={busy}
                onClick={() => void inspect()}
              >
                {t(busy ? "busy" : "inspect")}
              </button>
              {review && (
                <ReviewPanel
                  review={review}
                  kind={kind}
                  tax={tax}
                  priceBasis={sourcePriceBasis}
                  setPriceBasis={setPriceBasis}
                  setTax={setTax}
                  group={group}
                  setGroup={setGroup}
                  groups={groups}
                  approved={approved}
                  setApproved={setApproved}
                  busy={busy}
                  canImport={
                    canImport &&
                    (!review.records.length ||
                      kind !== "products" ||
                      !!sourcePriceBasis) &&
                    (!review.records.length ||
                      kind !== "pages" ||
                      !!designerPackage?.active)
                  }
                  start={start}
                  mainLocale={mainLocale}
                />
              )}
            </section>
            <JobHistory
              grouped={!!plan}
              more={more}
              hasMore={hasMore}
              request={request}
              jobs={jobs}
              manage={canManage}
              busy={busy}
              onBusy={setBusy}
              onError={setError}
              onRefresh={refresh}
              onReview={(value) => {
                setKind(value.kind);
                setSourceId(value.sourceId);
                adoptReview(value);
              }}
              onNext={async (result) => {
                setKind(result.kind);
                setSourceId(result.sourceId);
                if (isPrivate(result.kind) && result.target)
                  setTarget(result.target);
                await inspect(result.nextCursor, result.kind, result.sourceId);
              }}
            />
          </main>
        </div>
      )}
      {error && <p role="alert">{error}</p>}
      {install && (
        <InstallConsent
          app={install}
          request={request}
          onCancel={() => setInstall(undefined)}
          onInstalled={async () => {
            setInstall(undefined);
            await load();
          }}
        />
      )}
      {agent && <Agent onClose={() => setAgent(false)} {...agentContext} />}
    </div>
  );
}

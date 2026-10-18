/** App-owned inward migration workflow: native consent, exact reviewed pages, private product targets and durable jobs. */
import { useEffect, useRef, useState } from "react";
import type { RequestFn } from "../../../../frontend/src/shared/api/types";
import InstallConsent from "./InstallConsent";
import Icon from "../../../../frontend/src/shared/ui/Icon";
import Connection from "./Connection";
import Jobs from "./Jobs";
import Target from "./Target";
import MigrationSteps from "./MigrationSteps";
import ReviewPanel from "./ReviewPanel";
import Agent from "./Agent";
import useSourceReview from "./useSourceReview";
import { useMigrationText } from "./i18n";
import {
  isPrivate,
  importRights,
  importOptions,
  reviewPriceBasis,
  type Kind,
  type Review,
  type Job,
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
  const [app, setApp] = useState<{ active: boolean; revision: number }>(),
    [install, setInstall] = useState<string>(),
    [designerPackage, setDesignerPackage] = useState<{
      active: boolean;
      digest: string;
    }>(),
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
    [groups, setGroups] = useState<
      { id: string; name: Record<string, string> }[]
    >([]),
    [jobs, setJobs] = useState<Job[]>([]),
    [working, setBusy] = useState(false),
    [error, setError] = useState("");
  const canRead = rights.includes("apps.read"),
    canManage = rights.includes("apps.manage"),
    canImport = importRights(kind).every((p) => rights.includes(p));
  const load = async () => {
    const owner = request;
    const v = await owner("/api/apps");
    if (current.current !== owner) return;
    setApp(v.packages.find((p: { id: string }) => p.id === "migration"));
    setDesignerPackage(
      v.packages.find((p: { id: string }) => p.id === "site_builder"),
    );
  };
  useEffect(() => {
    setReview(undefined);
    setTarget(undefined);
    setJobs([]);
    setError("");
    setApp(undefined);
    if (canRead) void load().catch((e) => setError(e.message));
  }, [request, canRead]);
  useEffect(() => {
    if (!app?.active || !canManage) return;
    let active = true;
    const update = () =>
      request("/api/apps/migration/jobs")
        .then((v) => {
          if (active) setJobs(v.jobs);
        })
        .catch((e) => {
          if (active) setError(e.message);
        });
    void update();
    const timer = setInterval(update, 4000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [request, app?.active, canManage]);
  useEffect(() => {
    if (
      kind !== "customers" ||
      !rights.includes("customers.write") ||
      !rights.includes("customers.pii")
    )
      return;
    let active = true;
    void request("/api/merchant/customers/create-context")
      .then((v) => {
        if (active) setGroups(v.elements);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [kind, request, rights]);
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
    onReview: adoptReview,
    onError: setError,
  });
  const busy = working || inspecting;
  const sourcePriceBasis = priceBasis || reviewPriceBasis(review) || "";
  const start = async () => {
    if (
      !review ||
      !canImport ||
      !approved ||
      (kind === "pages" && !designerPackage?.active)
    )
      return;
    const owner = request;
    setBusy(true);
    setError("");
    try {
      const destination = isPrivate(kind)
        ? (target ??
          (await owner("/api/environments", { name: t("title") })).id)
        : workspace;
      if (current.current !== owner) return;
      if (isPrivate(kind)) setTarget(destination);
      const options = importOptions(kind, {
        tax,
        sourcePriceBasis,
        group,
        mainLocale,
        destinationDigest: designerPackage?.digest,
      });
      const warnings = [
        ...new Set(review.records.flatMap((row) => row.warnings)),
      ];
      if (warnings.length)
        Object.assign(options, { acknowledgedWarnings: warnings });
      await owner(
        "/api/apps/migration/actions/import_" + kind,
        {
          sourceId,
          kind,
          target: destination,
          recordDigests: review.recordDigests,
          options,
          ...(cursor ? { cursor } : {}),
        },
        "POST",
        { idempotencyKey: crypto.randomUUID() },
      );
      if (current.current === owner) {
        setApproved(false);
        setJobs((await owner("/api/apps/migration/jobs")).jobs);
      }
    } catch (e) {
      if (current.current === owner) setError((e as Error).message);
    } finally {
      if (current.current === owner) setBusy(false);
    }
  };
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
            onDesign={
              onDesign
                ? async () => {
                    setBusy(true);
                    setError("");
                    const owner = request;
                    try {
                      const preview =
                        target ??
                        (await owner("/api/environments", { name: t("title") }))
                          .id;
                      if (current.current !== owner) return;
                      setTarget(preview);
                      await onDesign?.(preview, review?.records[0]?.sourceShop);
                    } catch (e) {
                      if (current.current === owner)
                        setError((e as Error).message);
                    } finally {
                      if (current.current === owner) setBusy(false);
                    }
                  }
                : undefined
            }
          />
          <main>
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
                    setApproved(false);
                  }}
                  onError={setError}
                />
              )}
              <details>
                <summary>{t("sourceId")}</summary>
                <input
                  aria-label={t("sourceId")}
                  value={sourceId}
                  maxLength={100}
                  onChange={(e) => {
                    setSourceId(e.target.value);
                    setReview(undefined);
                    setApproved(false);
                  }}
                />
              </details>
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
                    (kind !== "products" || !!sourcePriceBasis) &&
                    (kind !== "pages" || !!designerPackage?.active)
                  }
                  start={start}
                  mainLocale={mainLocale}
                />
              )}
            </section>
            <section className="studio-card">
              <h2>{t("jobs")}</h2>
              <Jobs
                request={request}
                jobs={jobs}
                manage={canManage}
                busy={busy}
                onBusy={setBusy}
                onError={setError}
                onJobs={setJobs}
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
                  await inspect(
                    result.nextCursor,
                    result.kind,
                    result.sourceId,
                  );
                }}
              />
            </section>
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
      {agent && (
        <Agent onClose={() => setAgent(false)} kind={kind} review={review} />
      )}
    </div>
  );
}

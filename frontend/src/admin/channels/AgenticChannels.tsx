/** One merchant entry for inbound shops and native agent checkout; technical support never masquerades as external approval. */
import { useEffect, useState } from "react";
import type { RequestFn } from "../shell/studio-types";
import type { IntakeMode } from "../catalog/catalog-intake-model";
import type { Channel } from "./channel-model";
import { useLocale } from "../../shared/i18n/i18n";
import { contentText } from "../../shared/i18n/content-language";
import Icon from "../../shared/ui/Icon";
import { useAgenticChannelText } from "./agentic-channel-i18n";
import "../styles/agentic-channels.css";
type Readiness = {
  cartTransfer: boolean;
  buyerConsent: boolean;
  externalAcceptance: string;
  configuredPayments: { id: string; mode: string }[];
};
export default function AgenticChannels({
  request,
  canRead,
  canImport,
  onImport,
  onBack,
  channels,
  mainLocale,
  selectedChannel,
  onChannel,
}: {
  request: RequestFn;
  canRead: boolean;
  canImport: boolean;
  onImport: (mode: IntakeMode) => void;
  onBack: () => void;
  channels: Channel[];
  mainLocale: string;
  selectedChannel?: string;
  onChannel?: (channel: string) => void;
}) {
  const t = useAgenticChannelText(),
    { locale } = useLocale();
  const [localChannel, setLocalChannel] = useState("default"),
    [readiness, setReadiness] = useState<Readiness>(),
    [error, setError] = useState("");
  const channel = selectedChannel ?? localChannel;
  const setChannel = onChannel ?? setLocalChannel;
  useEffect(() => {
    let active = true;
    setReadiness(undefined);
    setError("");
    if (canRead)
      request("/api/merchant/catalog/intake", undefined, undefined, {
        salesChannel: channel,
      })
        .then((v) => {
          if (active) setReadiness(v.agentic);
        })
        .catch((e) => {
          if (active) setError(e.message);
        });
    return () => {
      active = false;
    };
  }, [request, channel, canRead]);
  const cards = [
    {
      id: "shopify",
      icon: "code",
      hint: "shopifyHint",
      label: "importShopify",
      mode: "shopify_csv",
    },
    {
      id: "supplier",
      icon: "globe",
      hint: "supplierHint",
      label: "importSupplier",
      mode: "shop_mcp",
    },
    {
      id: "others",
      icon: "link",
      hint: "othersHint",
      label: "csv",
      mode: "csv",
    },
  ] as const;
  return (
    <section className="agentic-channels">
      <header>
        <div>
          <button type="button" className="studio-secondary" onClick={onBack}>
            <Icon name="arrow" />
            {t("back")}
          </button>
          <h2>{t("title")}</h2>
          <p>{t("intro")}</p>
        </div>
        <label>
          {t("channel")}
          <select value={channel} onChange={(e) => setChannel(e.target.value)}>
            {channels.length ? (
              channels.map((c) => (
                <option key={c.id} value={c.id}>
                  {contentText(c.data.name, locale, mainLocale) || c.id}
                </option>
              ))
            ) : (
              <option value="default">{t("default")}</option>
            )}
          </select>
        </label>
      </header>
      {!canRead && <p role="status">{t("permission")}</p>}
      {error && <p role="alert">{error}</p>}
      <article className="studio-card agentic-protocol">
        <div>
          <Icon name="spark" />
          <h3>{t("google")}</h3>
          <p>{t("googleHint")}</p>
          <a
            href="https://developers.google.com/merchant/ucp/guides/overview/cart-overview"
            target="_blank"
            rel="noreferrer"
          >
            {t("guide")} ↗
          </a>
        </div>
        <div>
          <h4>{t("native")}</h4>
          <dl>
            <dt>{t("cart")}</dt>
            <dd>{t(readiness?.cartTransfer ? "ready" : "unknown")}</dd>
            <dt>{t("consent")}</dt>
            <dd>{t(readiness?.buyerConsent ? "ready" : "unknown")}</dd>
          </dl>
          {readiness && <p className="soft-tag">{t("approval")}</p>}
        </div>
      </article>
      <div className="agentic-import-cards">
        {cards.map((c) => (
          <article className="studio-card" key={c.id}>
            <span className="channel-avatar">
              <Icon name={c.icon} size={24} />
            </span>
            <h3>{t(c.id)}</h3>
            <p>{t(c.hint)}</p>
            <button
              type="button"
              className="studio-primary"
              disabled={!canRead || !canImport}
              onClick={() => onImport(c.mode)}
            >
              {t(c.label)}
            </button>
            {c.id === "others" && (
              <button
                type="button"
                className="studio-secondary"
                disabled={!canRead || !canImport}
                onClick={() => onImport("url")}
              >
                {t("url")}
              </button>
            )}
          </article>
        ))}
      </div>
      <aside className="studio-card">
        <h3>{t("payment")}</h3>
        <p>{t("paymentHint")}</p>
        <div>
          {readiness?.configuredPayments.map((p) => (
            <span className="soft-tag" key={p.id}>
              {p.id} · {p.mode}
            </span>
          ))}
        </div>
      </aside>
    </section>
  );
}

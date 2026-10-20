/** Current authorized source/target preview; no values enter job history and no inspection performs a write. */
import { useEffect, useRef, useState } from "react";
import type { RequestFn } from "../../../../frontend/src/shared/api/types";
import { useLocale } from "../../../../frontend/src/shared/i18n/i18n";
import { inheritedText } from "../../../../frontend/src/shared/geography/geography-types";
import { contentText } from "../../../../frontend/src/shared/i18n/content-language";
import { rowAmount, rowName, type Review, type SourceRecord } from "./model";
import { usePreviewText } from "./preview-i18n";
import "./product-comparison.css";
type Snapshot = {
  translations: Record<string, { name: string; description: string }>;
  sku: string;
  active: boolean;
  parentId: string | null;
  options: Record<string, string>;
  price: { amount: string; currency: string };
  taxRate: number;
  media: { url: string }[];
};
type Result = {
  status: "matching" | "changed" | "missing";
  differences: string[];
  checkedAt: string;
  preview: { expected: Snapshot; actual: Snapshot | null };
};
export type ComparisonProps = {
  review: Review;
  mainLocale: string;
  target?: string;
  revision?: string;
  tax: string;
  priceBasis: string;
  rights: string[];
  scopedRequest?: (target: string) => RequestFn;
};
export default function ProductComparison(props: ComparisonProps) {
  const { review, target, tax, priceBasis, rights, scopedRequest, mainLocale } =
    props;
  const t = usePreviewText(),
    { locale } = useLocale();
  const [selected, setSelected] = useState(review.records[0]?.sourceId ?? ""),
    [saved, setSaved] = useState<{
      scope: string;
      request: ComparisonProps["scopedRequest"];
      value: Result;
    }>(),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const row = review.records.find((row) => row.sourceId === selected);
  const admitted =
    !!target &&
    !!scopedRequest &&
    ["apps.manage", "catalog.read", "environments.read"].every((right) =>
      rights.includes(right),
    ) &&
    ["gross", "net"].includes(priceBasis) &&
    tax.trim() !== "" &&
    Number.isFinite(Number(tax)) &&
    Number(tax) >= 0 &&
    Number(tax) <= 50;
  const scope = JSON.stringify([
    review,
    props.revision,
    selected,
    target,
    tax,
    priceBasis,
    [...rights].sort(),
  ]);
  const result =
    saved?.scope === scope && saved.request === scopedRequest
      ? saved.value
      : undefined;
  const current = useRef({ scope, scopedRequest });
  current.current = { scope, scopedRequest };
  const serial = useRef(0);
  useEffect(() => {
    serial.current++;
    setSaved(undefined);
    setError("");
    setBusy(false);
    return () => {
      serial.current++;
    };
  }, [scope, scopedRequest]);
  useEffect(() => setSelected(review.records[0]?.sourceId ?? ""), [review]);
  const read = async () => {
    if (!admitted || !row) return;
    const owner = current.current,
      epoch = ++serial.current;
    setBusy(true);
    setSaved(undefined);
    setError("");
    try {
      const value = await scopedRequest!(target!)(
        "/api/merchant/imports/inspect",
        {
          record: row,
          options: {
            channelId: "default",
            taxRate: Number(tax),
            sourcePriceBasis: priceBasis,
          },
          details: true,
        },
      );
      if (
        serial.current === epoch &&
        current.current.scope === owner.scope &&
        current.current.scopedRequest === owner.scopedRequest
      ) {
        if (!value.preview) throw new Error(t("prerequisite"));
        setSaved({ scope: owner.scope, request: owner.scopedRequest, value });
      }
    } catch (e) {
      if (serial.current === epoch && current.current.scope === owner.scope)
        setError((e as Error).message);
    } finally {
      if (serial.current === epoch && current.current.scope === owner.scope)
        setBusy(false);
    }
  };
  const fields = [
    "name",
    "description",
    "sku",
    "price",
    "taxRate",
    "active",
    "parentId",
    "options",
  ] as const;
  const display = (s: Snapshot, key: (typeof fields)[number]) => {
    if (key === "name" || key === "description")
      return (
        inheritedText(s.translations, locale, mainLocale, key) || t("none")
      );
    if (key === "price") return `${s.price.amount} ${s.price.currency}`;
    if (key === "taxRate") return `${s.taxRate} %`;
    if (key === "active") return t(s.active ? "yes" : "no");
    if (key === "options")
      return (
        Object.entries(s.options ?? {})
          .map(([k, v]) => `${k}: ${v}`)
          .join(" · ") || t("none")
      );
    return s[key] || t("none");
  };
  const source = (r: SourceRecord, key: (typeof fields)[number]) => {
    if (key === "name")
      return contentText(r.data.name ?? {}, locale, mainLocale) || rowName(r);
    if (key === "description")
      return (
        contentText(r.data.description ?? {}, locale, mainLocale) || t("none")
      );
    if (key === "price") return rowAmount(r);
    if (key === "sku") return r.data.sku || t("none");
    if (key === "active")
      return typeof r.data.catalogActive === "boolean"
        ? t(r.data.catalogActive ? "yes" : "no")
        : t("none");
    if (key === "parentId") return r.data.parentSourceId || t("none");
    if (key === "options")
      return (
        Object.entries(r.data.options ?? {})
          .map(([k, v]) => `${k}: ${v}`)
          .join(" · ") || t("none")
      );
    return t("none");
  };
  return (
    <section className="migration-product-comparison" aria-label={t("title")}>
      <h3>{t("title")}</h3>
      <p>{t("hint")}</p>
      <div className="migration-compare-controls">
        <label>
          {t("choose")}
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
          >
            {review.records.map((row) => (
              <option key={row.sourceId} value={row.sourceId}>
                {rowName(row)}
              </option>
            ))}
          </select>
        </label>
        <button
          className="studio-secondary"
          disabled={!admitted || busy || !row}
          onClick={() => void read()}
        >
          {t(busy ? "busy" : "load")}
        </button>
      </div>
      {!admitted && <p role="status">{t("prerequisite")}</p>}
      {error && <p role="alert">{error}</p>}
      {result && row && (
        <>
          <p
            role="status"
            className="migration-compare-status"
            data-status={result.status}
          >
            {t(result.status)} · {t("checked")}{" "}
            <time dateTime={result.checkedAt}>
              {new Date(result.checkedAt).toLocaleString(locale)}
            </time>
          </p>
          <div className="migration-table">
            <table>
              <thead>
                <tr>
                  <th>{t("field")}</th>
                  <th>{t("source")}</th>
                  <th>{t("mapped")}</th>
                  <th>{t("target")}</th>
                </tr>
              </thead>
              <tbody>
                {fields.map((field) => (
                  <tr
                    key={field}
                    data-changed={
                      result.preview.actual &&
                      display(result.preview.expected, field) !==
                        display(result.preview.actual, field)
                    }
                  >
                    <th>{t(field)}</th>
                    <td>{source(row, field)}</td>
                    <td>{display(result.preview.expected, field)}</td>
                    <td>
                      {result.preview.actual
                        ? display(result.preview.actual, field)
                        : t("missing")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="migration-compare-media">
            <strong>{t("media")}</strong>
            <p>{t("sourceImages")}</p>
            {result.preview.actual?.media
              .filter((m) => /^(https?:\/\/|\/[^/])/.test(m.url))
              .map((m, i) => (
                <img
                  key={`${m.url}:${i}`}
                  src={m.url}
                  alt={`${rowName(row)} ${i + 1}`}
                  loading="lazy"
                  referrerPolicy="no-referrer"
                />
              ))}
          </div>
          {!!result.differences.length && (
            <details>
              <summary>
                {t("differences")} · {result.differences.length} · {t("raw")}
              </summary>
              <ul>
                {result.differences.map((path) => (
                  <li key={path}>
                    <code>{path}</code>
                  </li>
                ))}
              </ul>
            </details>
          )}
          <p className="migration-compare-notice">{t("notice")}</p>
        </>
      )}
    </section>
  );
}

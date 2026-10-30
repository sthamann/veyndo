/** Native map editing uses explicit row creation and collision-safe rename on blur, never whitespace keys or overwritten siblings. */
import { useState, useId } from "react";
import { useCatalogText } from "../../shared/i18n/catalog-i18n";
import Icon from "../../shared/ui/Icon";
import { useProductSpecificationText } from "./product-specification-i18n";
import "../styles/product-specifications.css";
export default function PairFields({
  value,
  onChange,
  disabled = false,
}: {
  value: Record<string, string>;
  onChange: (v: Record<string, string>) => void;
  disabled?: boolean;
}) {
  const { c } = useCatalogText(),
    t = useProductSpecificationText();
  const [name, setName] = useState(""),
    [text, setText] = useState(""),
    [error, setError] = useState("");
  const id = useId(),
    entries = Object.entries(value);
  const bytes = (s: string) => new TextEncoder().encode(s).length;
  const issue = (key: string, val: string, original?: string) =>
    !key.trim() || bytes(key) > 100 || bytes(val) > 1000
      ? t("invalid")
      : key !== original && Object.hasOwn(value, key)
        ? t("duplicate")
        : "";
  return (
    <div className="catalog-pairs product-spec-pairs">
      {!entries.length && <p className="product-spec-hint">{t("empty")}</p>}
      {entries.map(([key, val], index) => (
        <div className="catalog-pair" key={key}>
          <label>
            {c("key")}
            <input
              defaultValue={key}
              disabled={disabled}
              aria-describedby={error ? `${id}-error` : undefined}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  e.currentTarget.blur();
                }
                if (e.key === "Escape") {
                  e.currentTarget.value = key;
                  e.currentTarget.blur();
                }
              }}
              onBlur={(e) => {
                const next = e.currentTarget.value;
                if (next === key) return;
                const problem = issue(next, val, key);
                setError(problem);
                if (problem) {
                  e.currentTarget.value = key;
                  return;
                }
                onChange(
                  Object.fromEntries(
                    entries.map(([k, v], i) =>
                      i === index ? [next, v] : [k, v],
                    ),
                  ),
                );
              }}
            />
          </label>
          <label>
            {c("value")}
            <input
              value={val}
              disabled={disabled}
              onChange={(e) => {
                const problem =
                  bytes(e.target.value) > 1000 ? t("invalid") : "";
                setError(problem);
                if (!problem) onChange({ ...value, [key]: e.target.value });
              }}
            />
          </label>
          <button
            type="button"
            className="studio-secondary"
            disabled={disabled}
            aria-label={`${c("remove")} ${key}`}
            onClick={() => {
              setError("");
              onChange(Object.fromEntries(entries.filter(([k]) => k !== key)));
            }}
          >
            <Icon name="close" />
          </button>
        </div>
      ))}
      {!disabled && (
        <>
          <div className="catalog-pair product-spec-add">
            <label>
              {t("newKey")}
              <input value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            <label>
              {t("newValue")}
              <input value={text} onChange={(e) => setText(e.target.value)} />
            </label>
            <button
              type="button"
              className="studio-secondary"
              disabled={!name.trim() || entries.length >= 40}
              onClick={() => {
                const problem = issue(name, text);
                setError(problem);
                if (problem) return;
                onChange({ ...value, [name]: text });
                setName("");
                setText("");
              }}
            >
              <Icon name="plus" />
              {t("add")}
            </button>
          </div>
          <p className="product-spec-hint">
            {entries.length >= 40 ? t("limit") : t("addHint")}
          </p>
        </>
      )}
      {error && (
        <p id={`${id}-error`} role="alert" className="product-spec-error">
          {error}
        </p>
      )}
    </div>
  );
}

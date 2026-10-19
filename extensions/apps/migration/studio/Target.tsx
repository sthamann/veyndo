/** Native private environments can be reused across categories, products and pages; operational records keep their live target. */
import { useEffect, useState } from "react";
import type { RequestFn } from "../../../../frontend/src/shared/api/types";
import { useMigrationText } from "./i18n";
export default function Target({
  request,
  read,
  value,
  onChange,
  onError,
}: {
  request: RequestFn;
  read: boolean;
  value?: string;
  onChange: (value?: string) => void;
  onError: (value: string) => void;
}) {
  const t = useMigrationText(),
    [items, setItems] = useState<{ id: string; name: string }[]>([]);
  useEffect(() => {
    if (!read) return;
    let active = true;
    void request("/api/environments")
      .then((v) => {
        if (active) setItems(v.environments ?? []);
      })
      .catch((e) => {
        if (active) onError(e.message);
      });
    return () => {
      active = false;
    };
  }, [request, read]);
  return (
    <label>
      {t("target")}
      <select
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value || undefined)}
      >
        <option value="">{t("newPreview")}</option>
        {value && !items.some((i) => i.id === value) && (
          <option value={value}>{t("currentPreview")}</option>
        )}
        {items.map((i) => (
          <option value={i.id} key={i.id}>
            {i.name}
          </option>
        ))}
      </select>
      <small>{t("targetHint")}</small>
    </label>
  );
}

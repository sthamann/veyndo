/** A plain merchant brief opens an empty ordinary draft in the existing contextual agent. */
import { useState } from "react";
import type { Manifest } from "../../shared/apps/native/types";
import LocalizedField from "../../shared/i18n/LocalizedField";
import { contentText } from "../../shared/i18n/content-language";
import { useContentLanguage } from "../../shared/i18n/ContentLanguage";
import ContentLanguagePicker from "../../shared/i18n/ContentLanguagePicker";
import Icon from "../../shared/ui/Icon";
import { useAppBriefText } from "./brief-i18n";
import { textMap } from "./app-model";
import "../styles/app-brief.css";

export default function AppBrief({
  onCreate,
}: {
  onCreate: (manifest: Manifest, brief: string) => void;
}) {
  const t = useAppBriefText(),
    { language, mainLocale } = useContentLanguage();
  const [name, setName] = useState<Manifest["name"]>({}),
    [brief, setBrief] = useState("");
  return (
    <section className="app-brief">
      <div className="app-brief-heading">
        <Icon name="spark" size={24} />
        <div>
          <h3>{t("title")}</h3>
          <p>{t("intro")}</p>
        </div>
      </div>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (!brief.trim() || !contentText(name, language, mainLocale).trim())
            return;
          onCreate(
            {
              id: `app_${crypto.randomUUID().replaceAll("-", "").slice(0, 16)}`,
              version: "0.1.0",
              coreApi: "1",
              runtime: "declarative",
              category: "operations",
              name,
              permissions: ["data.read", "data.write", "admin.slot"],
              entities: [],
              views: [],
              surfaces: [],
              slots: [],
              actions: [],
              apiRoutes: [],
              intelligence: { description: {}, tools: [], entities: [] },
            },
            brief.trim(),
          );
        }}
      >
        <ContentLanguagePicker />
        <LocalizedField
          label={t("name")}
          value={name}
          onChange={(value) => setName(textMap(value))}
          maxLength={100}
          required
        />
        <label>
          {t("brief")}
          <textarea
            required
            maxLength={6000}
            rows={3}
            value={brief}
            onChange={(event) => setBrief(event.target.value)}
            placeholder={t("placeholder")}
          />
        </label>
        <small>{t("hint")}</small>
        <div className="app-brief-actions">
          <button
            type="button"
            className="studio-secondary"
            onClick={() => {
              setName({ [language]: t("exampleName") });
              setBrief(t("exampleBrief"));
            }}
          >
            {t("example")}
          </button>
          <button
            className="studio-primary"
            disabled={
              !brief.trim() || !contentText(name, language, mainLocale).trim()
            }
          >
            <Icon name="spark" />
            {t("prepare")}
          </button>
        </div>
        <p className="app-brief-next">{t("next")}</p>
      </form>
    </section>
  );
}

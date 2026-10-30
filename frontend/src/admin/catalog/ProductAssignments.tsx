/** Searchable product category paths and explicit channel choices share the native revisioned aggregate save. */
import { useMemo, useState } from "react";
import Icon, { type IconName } from "../../shared/ui/Icon";
import { useCatalogText } from "../../shared/i18n/catalog-i18n";
import { contentText } from "../../shared/i18n/content-language";
import { useChannelText } from "../channels/channel-i18n";
import {
  assignmentLanguage,
  assignmentSearch,
  categoryChoices,
  productChannelIds,
} from "./product-assignment-model";
import { useProductAssignmentText } from "./product-assignment-i18n";
import type { Category, ProductDraft } from "./catalog-model";
import "../styles/product-assignments.css";
const kindIcons: Record<string, IconName> = {
  storefront: "globe",
  headless: "code",
  pos: "register",
  marketplace: "layers",
};
export default function ProductAssignments({
  draft,
  categories,
  language,
  canWrite,
  onChange,
}: {
  draft: ProductDraft;
  categories: Category[];
  language: string;
  canWrite: boolean;
  onChange: (draft: ProductDraft) => void;
}) {
  const { c } = useCatalogText(),
    t = useProductAssignmentText(),
    channelText = useChannelText();
  const [search, setSearch] = useState(""),
    [channelSearch, setChannelSearch] = useState(""),
    [onlySelected, setOnlySelected] = useState(false),
    [limit, setLimit] = useState(50);
  const main = draft.mainLocale ?? "en-GB",
    contentLocale = assignmentLanguage(draft, language);
  const choices = useMemo(
    () => categoryChoices(categories, contentLocale, main),
    [categories, contentLocale, main],
  );
  const selected = draft.catalog.categoryIds,
    channels = draft.channels ?? [],
    channelIds = productChannelIds(draft);
  const names = new Map(
    choices.map(({ category, label }) => [category.id, label]),
  );
  const matches = choices.filter(
    ({ category, label }) =>
      (!onlySelected || selected.includes(category.id)) &&
      assignmentSearch(label).includes(assignmentSearch(search)),
  );
  const visible = matches.slice(0, limit);
  const channelMatches = channels.filter((channel) =>
    assignmentSearch(
      contentText(channel.data.name ?? {}, contentLocale, main) || channel.id,
    ).includes(assignmentSearch(channelSearch)),
  );
  const chooseCategory = (id: string, checked: boolean) => {
    if (!canWrite) return;
    onChange({
      ...draft,
      catalog: {
        ...draft.catalog,
        categoryIds: checked
          ? [...new Set([...selected, id])]
          : selected.filter((value) => value !== id),
      },
    });
  };
  return (
    <div className="product-assignments">
      <section
        className="product-assignment-section"
        aria-label={c("categories")}
      >
        <header>
          <h3>{c("categories")}</h3>
          <span>{t("selected", { count: selected.length })}</span>
        </header>
        <p>{c("categoryHint")}</p>
        {!!selected.length ? (
          <ul className="product-assignment-selected">
            {selected.map((id) => (
              <li key={id}>
                <span>{names.get(id) ?? `${t("unavailable")} · ${id}`}</span>
                <button
                  type="button"
                  disabled={!canWrite}
                  aria-label={t("remove", { name: names.get(id) ?? id })}
                  onClick={() => chooseCategory(id, false)}
                >
                  <Icon name="close" size={16} />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="product-assignment-empty">{t("noSelection")}</p>
        )}
        {!!categories.length && (
          <div className="product-assignment-tools">
            <label className="product-assignment-search">
              <span>{t("categorySearch")}</span>
              <input
                type="search"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setLimit(50);
                }}
              />
            </label>
            <label className="checkbox-label product-assignment-filter">
              <input
                type="checkbox"
                checked={onlySelected}
                onChange={(event) => {
                  setOnlySelected(event.target.checked);
                  setLimit(50);
                }}
              />
              {t("onlySelected")}
            </label>
          </div>
        )}
        <div className="product-assignment-list">
          {visible.map(({ category, label }) => (
            <label
              className="checkbox-label product-assignment-choice"
              key={category.id}
            >
              <input
                type="checkbox"
                checked={selected.includes(category.id)}
                disabled={!canWrite}
                onChange={(event) =>
                  chooseCategory(category.id, event.target.checked)
                }
              />
              <span>{label}</span>
            </label>
          ))}
          {!visible.length && (
            <p className="product-assignment-empty">
              {t(categories.length ? "noMatches" : "noCategories")}
            </p>
          )}
        </div>
        {!!categories.length && (
          <footer>
            <span role="status">
              {t("results", { count: visible.length, total: matches.length })}
            </span>
            {visible.length < matches.length && (
              <button
                type="button"
                className="studio-secondary"
                onClick={() => setLimit((old) => old + 50)}
              >
                {t("more")}
              </button>
            )}
          </footer>
        )}
      </section>
      <section
        className="product-assignment-section"
        aria-label={t("channels")}
      >
        <header>
          <h3>{t("channels")}</h3>
          <span>{t("selected", { count: channelIds.length })}</span>
        </header>
        <p>{c("channelsHint")}</p>
        {!draft.catalog.active && (
          <p className="product-assignment-notice">{t("inactiveProduct")}</p>
        )}
        {!!channels.length && !channelIds.length && (
          <p className="product-assignment-notice" role="status">
            {t("noneVisible")}
          </p>
        )}
        {channels.length > 6 && (
          <label className="product-assignment-search">
            <span>{t("channelSearch")}</span>
            <input
              type="search"
              value={channelSearch}
              onChange={(event) => setChannelSearch(event.target.value)}
            />
          </label>
        )}
        <div className="product-assignment-list">
          {channelMatches.map((channel) => (
            <label
              className="checkbox-label product-assignment-choice product-assignment-channel"
              key={channel.id}
            >
              <input
                type="checkbox"
                disabled={!canWrite}
                checked={channelIds.includes(channel.id)}
                onChange={(event) => {
                  if (!canWrite) return;
                  onChange({
                    ...draft,
                    catalog: {
                      ...draft.catalog,
                      salesChannelIds: event.target.checked
                        ? [...new Set([...channelIds, channel.id])]
                        : channelIds.filter((id) => id !== channel.id),
                    },
                  });
                }}
              />
              <Icon name={kindIcons[channel.data.kind] ?? "globe"} />
              <span>
                <strong>
                  {contentText(channel.data.name ?? {}, contentLocale, main) ||
                    channel.id}
                </strong>
                <small>
                  {channelText(
                    Object.hasOwn(kindIcons, channel.data.kind)
                      ? channel.data.kind
                      : "storefront",
                  )}
                </small>
                {channel.data.active === false && (
                  <small>{t("inactive")}</small>
                )}
                {channel.data.visibility === "private" && (
                  <small>{t("private")}</small>
                )}
                {!!draft.id &&
                  Array.isArray(channel.data.productIds) &&
                  channel.data.productIds.length > 0 &&
                  !channel.data.productIds.includes(draft.id) && (
                    <small className="product-assignment-restriction">
                      {t("excluded")}
                    </small>
                  )}
              </span>
            </label>
          ))}
          {!!channels.length && !channelMatches.length && (
            <p className="product-assignment-empty">{t("noMatches")}</p>
          )}
          {!channels.length && (
            <p className="product-assignment-empty">
              {t(draft.id ? "noChannels" : "saveFirst")}
            </p>
          )}
        </div>
      </section>
    </div>
  );
}

/** Grouped product and installed-app sections share keyboard navigation and one compact mobile selector. */
import type { KeyboardEvent } from "react";
import { useLegalText } from "../../shared/i18n/legal-i18n";
import { useAppSurfaces, surfaceLabel } from "../../shared/apps/AppSurfaces";
import { useCatalogText } from "../../shared/i18n/catalog-i18n";
import Icon, { type IconName } from "../../shared/ui/Icon";
import {
  useProductEditorText,
  type ProductEditorWord,
} from "./product-editor-i18n";
export const productTabs = [
  "general",
  "prices",
  "media",
  "variants",
  "assignments",
  "specs",
  "seo",
  "related",
  "attachments",
  "reviews",
  "compliance",
] as const;
const groups: { title: ProductEditorWord; tabs: [string, IconName][] }[] = [
  {
    title: "information",
    tabs: [
      ["general", "box"],
      ["media", "image"],
      ["variants", "layers"],
      ["specs", "table"],
    ],
  },
  {
    title: "selling",
    tabs: [
      ["prices", "card"],
      ["assignments", "globe"],
      ["related", "link"],
    ],
  },
  {
    title: "content",
    tabs: [
      ["seo", "search"],
      ["attachments", "copy"],
      ["reviews", "chat"],
      ["compliance", "check"],
    ],
  },
];
export default function ProductEditorNav({
  tabs,
  tab,
  id,
  panelId,
  onSelect,
}: {
  tabs: readonly string[];
  tab: string;
  id: string;
  panelId: string;
  onSelect: (t: string) => void;
}) {
  const { l } = useLegalText();
  const { c, locale } = useCatalogText();
  const e = useProductEditorText();
  const appTabs = useAppSurfaces().filter(
    (s) => s.surface.location === "admin.product.tab",
  );
  const sections: {
    title: string;
    items: { key: string; icon: IconName; label: string }[];
  }[] = groups.map((group) => ({
    title: e(group.title),
    items: group.tabs
      .filter(([key]) => tabs.includes(key))
      .map(([key, icon]) => ({
        key,
        icon,
        label:
          key === "compliance"
            ? l("compliance")
            : c(key as Parameters<typeof c>[0]),
      })),
  }));
  if (id && appTabs.length)
    sections.push({
      title: e("extensions"),
      items: appTabs.map((s) => ({
        key: `app:${s.app}:${s.surface.id}`,
        icon: "layers",
        label: surfaceLabel(s, locale),
      })),
    });
  const navigate = (event: KeyboardEvent<HTMLDivElement>) => {
    const buttons = Array.from(
      event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]'),
    );
    const current = buttons.indexOf(event.target as HTMLButtonElement);
    const next =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? buttons.length - 1
          : event.key === "ArrowDown"
            ? (current + 1) % buttons.length
            : event.key === "ArrowUp"
              ? (current + buttons.length - 1) % buttons.length
              : -1;
    if (current < 0 || next < 0) return;
    event.preventDefault();
    // Manual activation keeps focus usable when a rich-text buffer blocks switching.
    buttons[next].focus();
  };
  return (
    <aside
      className="catalog-detail-nav product-editor-nav"
      aria-label={e("section")}
    >
      <label className="product-editor-mobile-nav">
        {e("section")}
        <select value={tab} onChange={(event) => onSelect(event.target.value)}>
          {sections.map((group) => (
            <optgroup key={group.title} label={group.title}>
              {group.items.map(({ key, label }) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </label>
      <div
        className="product-editor-tablist"
        role="tablist"
        aria-label={e("section")}
        aria-orientation="vertical"
        onKeyDown={navigate}
      >
        {sections.map((group) => (
          <div
            className="product-editor-nav-group"
            key={group.title}
            role="presentation"
          >
            <p>{group.title}</p>
            {group.items.map(({ key, icon, label }) => (
              <button
                type="button"
                key={key}
                role="tab"
                id={`${panelId}-tab-${key}`}
                aria-controls={panelId}
                aria-selected={tab === key}
                tabIndex={tab === key ? 0 : -1}
                onClick={() => onSelect(key)}
              >
                <Icon name={icon} />
                <span>{label}</span>
              </button>
            ))}
          </div>
        ))}
      </div>
    </aside>
  );
}

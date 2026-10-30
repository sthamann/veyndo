/** The overview follows the editor's channel inheritance and includes its current unsaved draft. */
import {
  effectivePages,
  explicitTheme,
  inheritedTheme,
  type Page,
} from "../model";

export function overviewPages(pages: Page[], channel: string, draft?: Page) {
  const current = draft
    ? [...pages.filter((page) => page.id !== draft.id), draft]
    : pages;
  return effectivePages(current, channel)
    .filter((page) => page.status !== "archived")
    .sort(
      (a, b) =>
        Number(b.slug === "home") - Number(a.slug === "home") ||
        a.slug.localeCompare(b.slug),
    );
}

export function overviewTheme(
  pages: Page[],
  channel: string,
  page?: Page,
  draft?: Page,
) {
  const current = draft
    ? [...pages.filter((saved) => saved.id !== draft.id), draft]
    : pages;
  return { ...inheritedTheme(current, channel), ...explicitTheme(page?.theme) };
}

/** Published pages use the selected content language even when Studio/store controls use another locale. */
import {
  render,
  screen,
  waitFor,
  expect,
  it,
  vi,
} from "../../../../frontend/tests/unit/package-test-support";
import { LocaleScope } from "../../../../frontend/src/shared/i18n/i18n";
import { AppSurfaceProvider } from "../../../../frontend/src/shared/apps/AppSurfaces";
import { StorefrontContext } from "../../../../frontend/src/storefront/shell/StorefrontContext";
import type { StorefrontController } from "../../../../frontend/src/storefront/shell/useStorefrontController";
import PublishedSite from "../storefront/PublishedSite";
import ShopSite from "../storefront/ShopSite";
import { newPage, newBlock } from "../model";

it.each([
  ["it-IT", "Autunno tranquillo", "Descrizione italiana", "Testo italiano"],
  ["nl-NL", "Automne calme", "Description française", "Texte français"],
])(
  "renders %s content and SEO independently of German controls",
  async (language, title, description, paragraph) => {
    history.replaceState(
      null,
      "",
      `/?shop=unit-shop&language=${language}#page/autumn`,
    );
    const page = {
      ...newPage("default", "fr-FR", "Automne calme"),
      slug: "autumn",
      status: "published" as const,
    };
    page.title["it-IT"] = "Autunno tranquillo";
    page.seo = {
      description: {
        "fr-FR": "Description française",
        "it-IT": "Descrizione italiana",
      },
    };
    const block = newBlock("text", "fr-FR", "Automne calme");
    block.text["it-IT"] = "Autunno tranquillo";
    block.rich = {
      "fr-FR": [{ type: "paragraph", text: "Texte français" }],
      "it-IT": [{ type: "paragraph", text: "Testo italiano" }],
    };
    page.content.blocks = [block];
    const request = vi.fn(async (path: string) =>
      path.endsWith("/surfaces")
        ? { surfaces: [], publicApps: ["site_builder"], mainLocale: "fr-FR" }
        : { elements: [{ ...page, revision: 1 }] },
    );
    const controller = {
      locale: "de-DE",
      salesChannel: "default",
      shopTenant: "unit-shop",
      appPath: "#page/autumn",
      company: { brandName: "Example" },
      products: [],
      s: (key: string) => key,
    } as unknown as StorefrontController;
    render(
      <LocaleScope locale="de-DE">
        <StorefrontContext.Provider value={controller}>
          <AppSurfaceProvider request={request} scopeKey="unit-shop" public>
            <PublishedSite>
              <ShopSite fallback={null} />
            </PublishedSite>
          </AppSurfaceProvider>
        </StorefrontContext.Provider>
      </LocaleScope>,
    );
    expect(await screen.findByRole("heading", { name: title })).toBeVisible();
    expect(screen.getByText(paragraph)).toBeVisible();
    await waitFor(() => expect(document.title).toBe(`${title} · Example`));
    expect(
      document
        .querySelector('meta[name="description"]')
        ?.getAttribute("content"),
    ).toBe(description);
  },
);

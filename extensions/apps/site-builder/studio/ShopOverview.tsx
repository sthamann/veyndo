/** Bounded side-by-side previews reuse the live page renderer and native editor's private read scope. */
import { useState } from "react";
import type { RequestFn } from "../../../../frontend/src/shared/api/types";
import { contentText } from "../../../../frontend/src/shared/i18n/content-language";
import SiteRenderer from "../Renderer";
import { explicitTheme, type Page } from "../model";
import usePageProducts from "../usePageProducts";
import StorefrontCanvas from "./StorefrontCanvas";
import type { Designer } from "./useDesigner";
import { overviewPages, overviewTheme } from "./overview-model";
import { useOverviewText } from "./overview-i18n";
import "./overview.css";

type Props = {
  d: Designer;
  request: RequestFn;
  workspace: string;
  shopName?: string;
  language: string;
  mainLocale: string;
  device: "desktop" | "tablet" | "mobile";
  onOpen: (page?: Page) => void;
};

function PagePreview({
  page,
  pages,
  ...props
}: Props & { page?: Page; pages: Page[] }) {
  const { d, request, workspace, language, mainLocale, onOpen } = props;
  const t = useOverviewText();
  const theme = overviewTheme(d.pages, d.channel, page, d.draft);
  const products = usePageProducts(
    page,
    d.context!.catalogue.elements,
    `${workspace}:${d.channel}:${language}`,
    async (ids) =>
      (
        await request(
          `/api/merchant/site/context?channel=${encodeURIComponent(d.channel)}&locale=${encodeURIComponent(language)}&ids=${encodeURIComponent(JSON.stringify(ids))}`,
        )
      ).catalogue.elements,
  );
  const title = page
    ? contentText(page.title, language, mainLocale) || page.slug
    : t("home");
  const source = !page
    ? "native"
    : page.slug === "home"
      ? "base"
      : Object.keys(explicitTheme(page.theme)).length
        ? "own"
        : "shared";
  return (
    <article className="designer-overview-page">
      <header>
        <div>
          <h3>{title}</h3>
          <p>{t(source)}</p>
        </div>
        <button
          type="button"
          onClick={() => onOpen(page)}
          aria-label={`${t("edit")}: ${title}`}
        >
          {t("edit")}
        </button>
      </header>
      {d.dirty && page?.id === d.draft?.id && (
        <p className="designer-overview-note">{t("draft")}</p>
      )}
      {products.error && <p role="alert">{t("failed")}</p>}
      <div className="designer-overview-viewport">
        <StorefrontCanvas
          request={request}
          workspace={workspace}
          shopName={props.shopName}
          channel={d.channel}
          language={language}
          device={props.device}
          appearance={page ? theme : undefined}
          products={products.products}
          onHome={() => onOpen(page)}
        >
          {page && (
            <SiteRenderer
              page={page}
              pages={pages}
              products={products.products}
              theme={theme}
              language={language}
              mainLocale={mainLocale}
              channel={d.channel}
              request={request}
              onSelect={() => onOpen(page)}
            />
          )}
        </StorefrontCanvas>
      </div>
    </article>
  );
}

export default function ShopOverview(props: Props) {
  const t = useOverviewText();
  const [offset, setOffset] = useState(0);
  const pages = overviewPages(props.d.pages, props.d.channel, props.d.draft);
  const entries: (Page | undefined)[] = pages.some(
    (page) => page.slug === "home",
  )
    ? pages
    : [undefined, ...pages];
  const start = Math.min(
    offset,
    Math.max(0, Math.ceil(entries.length / 4) - 1) * 4,
  );
  return (
    <section className="designer-overview" aria-label={t("overview")}>
      <p>{t("hint")}</p>
      <div className="designer-overview-grid">
        {entries.slice(start, start + 4).map((page) => (
          <PagePreview
            key={page?.id ?? "native-home"}
            {...props}
            page={page}
            pages={pages}
          />
        ))}
      </div>
      <nav className="designer-overview-paging" aria-label={t("overview")}>
        <button
          type="button"
          disabled={start === 0}
          onClick={() => setOffset(start - 4)}
        >
          {t("previous")}
        </button>
        <span>
          {start + 1}–{Math.min(start + 4, entries.length)} / {entries.length}
        </span>
        <button
          type="button"
          disabled={start + 4 >= entries.length}
          onClick={() => setOffset(start + 4)}
        >
          {t("next")}
        </button>
        {props.d.more && (
          <button type="button" onClick={() => void props.d.loadMore()}>
            {t("more")}
          </button>
        )}
      </nav>
    </section>
  );
}

/** Consistent main-language inheritance for product rich documents. */
import RichDescription from "../../shared/content/RichDescription";
import { lazy, Suspense, useState } from "react";
import { useEditorBuffer } from "../../shared/content/editor/EditorBuffer";
const RichEditor = lazy(() => import("../../shared/content/editor/RichEditor"));
import { useInternationalText } from "../../shared/i18n/international-i18n";
import type { ProductDraft } from "./catalog-model";
import "../styles/international.css";
import { productRichContent } from "./product-content-model";
import { useProductContentText } from "./product-content-i18n";
import { editorDocument } from "../../shared/content/editor/rich-conversion";
type Props = {
  canWrite?: boolean;
  draft: ProductDraft;
  lang: string;
  onChange: (d: ProductDraft) => void;
};
export function ProductRich({
  draft: d,
  lang,
  onChange,
  canWrite = true,
}: Props) {
  const [reset, setReset] = useState(0);
  const { i, locale } = useInternationalText();
  const buffer = useEditorBuffer();
  const t = useProductContentText();
  const { key, main, isMain, fromShortText, map, inherited, blocks } =
    productRichContent(d, lang);
  const set = (value: any) =>
    onChange({ ...d, extra: { ...d.extra, richDescription: value } });
  if (!canWrite) return <RichDescription blocks={blocks} />;
  return (
    <div>
      <div className="product-rich-language">
        {!isMain && (
          <button
            type="button"
            disabled={buffer.pending}
            className="intl-inherit"
            aria-pressed={inherited}
            onClick={() => {
              const next = { ...map };
              if (inherited) next[key] = structuredClone(blocks);
              else delete next[key];
              set(next);
              setReset((n) => n + 1);
            }}
          >
            {fromShortText
              ? t("shortSource")
              : i(inherited ? "inheritedFrom" : "customText")}{" "}
            {inherited && !fromShortText
              ? (new Intl.DisplayNames([locale], { type: "language" }).of(
                  main,
                ) ?? main)
              : ""}{" "}
            ↗
          </button>
        )}
      </div>
      {inherited && (
        <p className="product-content-hint">
          {t(fromShortText ? "shortSourceHint" : "inheritedHint")}
        </p>
      )}
      <Suspense fallback={<p role="status">{i("loading")}</p>}>
        <RichEditor
          key={`${key}:${reset}`}
          language={key}
          value={{
            ...map,
            [key]: [{ type: "document", doc: editorDocument(blocks) }],
          }}
          onChange={set}
        />
      </Suspense>
    </div>
  );
}

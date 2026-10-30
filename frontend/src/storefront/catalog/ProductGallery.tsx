/** Shared native product gallery; selection changes only local presentation state. */
import type { Product } from "../../shared/api/shop-api";
import { useShopText } from "../../shared/i18n/shop-i18n";
import ImagePlaceholder from "./ImagePlaceholder";
export default function ProductGallery({
  p,
  image,
  setImage,
}: {
  p: Product;
  image: number;
  setImage: (image: number) => void;
}) {
  const { s } = useShopText();
  return (
    <section className="pdp-gallery" aria-label={s("images")}>
      <div className="gallery-main">
        {p.media[image]?.url ? (
          <img
            src={p.media[image].url}
            alt={`${p.name} · ${Object.values(p.options).map(s).join(" / ")} · ${s(p.media[image].view ?? "front")}`}
            width="780"
            height="600"
          />
        ) : (
          <ImagePlaceholder label={s("noImage")} />
        )}
        {p.media.length > 0 && (
          <span>
            {s("images")} · {image + 1} / {p.media.length}
          </span>
        )}
      </div>
      <div className="gallery-thumbs">
        {p.media.map((m, i) => (
          <button
            key={m.id}
            aria-label={s(m.view)}
            aria-pressed={i === image}
            onClick={() => setImage(i)}
          >
            <img src={m.url} alt="" width="90" height="70" />
            <span>{s(m.view)}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

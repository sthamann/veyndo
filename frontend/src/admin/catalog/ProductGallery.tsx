/** Local gallery drag ordering edits the same product draft; arrows remain available in the image inspector. */
import { useRef, useState } from "react";
import Icon from "../../shared/ui/Icon";
import { useContentLanguage } from "../../shared/i18n/ContentLanguage";
import { useWorkspaceText } from "../../shared/i18n/workspace-i18n";
import { mediaAlt, moveImage, type GalleryImage } from "./media-model";
import { useProductMediaText } from "./product-media-i18n";
export default function ProductGallery({
  media,
  selected,
  canReorder,
  onSelect,
  onChange,
}: {
  media: GalleryImage[];
  selected: string;
  canReorder: boolean;
  onSelect: (id: string) => void;
  onChange: (media: GalleryImage[]) => void;
}) {
  const { language, mainLocale } = useContentLanguage(),
    { w } = useWorkspaceText(),
    t = useProductMediaText();
  const dragged = useRef<string | null>(null);
  const [target, setTarget] = useState<string | null>(null),
    [message, setMessage] = useState("");
  const finish = () => {
    dragged.current = null;
    setTarget(null);
  };
  return (
    <div className="media-gallery-order">
      <p className="media-order-hint">
        {t(canReorder ? "order" : "coverHint")}
      </p>
      <div className="media-image-grid">
        {media.map((image, index) => {
          const label =
            mediaAlt(image, language, mainLocale) || t("image", index + 1);
          return (
            <button
              key={image.id}
              type="button"
              className={`media-tile ${selected === image.id ? "is-selected" : ""} ${canReorder && target === image.id ? "is-drop-target" : ""}`}
              aria-label={label}
              aria-pressed={selected === image.id}
              draggable={canReorder}
              onClick={() => onSelect(image.id)}
              onDragStart={(event) => {
                if (!canReorder) {
                  event.preventDefault();
                  return;
                }
                dragged.current = image.id;
                event.dataTransfer.effectAllowed = "move";
                event.dataTransfer.setData("text/plain", image.id);
                setMessage("");
              }}
              onDragOver={(event) => {
                if (
                  !canReorder ||
                  !dragged.current ||
                  dragged.current === image.id
                )
                  return;
                event.preventDefault();
                event.dataTransfer.dropEffect = "move";
                setTarget(image.id);
              }}
              onDragLeave={(event) => {
                if (
                  !event.currentTarget.contains(
                    event.relatedTarget as Node | null,
                  )
                )
                  setTarget(null);
              }}
              onDragEnd={finish}
              onDrop={(event) => {
                event.preventDefault();
                const from = media.findIndex(
                  (item) => item.id === dragged.current,
                );
                finish();
                if (!canReorder || from < 0 || from === index) return;
                onChange(moveImage(media, from, index));
                onSelect(media[from].id);
                setMessage(t("moved", index + 1));
              }}
            >
              <img
                src={image.url}
                alt={mediaAlt(image, language, mainLocale)}
                loading="lazy"
                draggable={false}
              />
              {index === 0 && (
                <span className="media-cover-tag">{w("cover")}</span>
              )}
              {canReorder && (
                <span className="media-drag-handle" aria-hidden="true">
                  <Icon name="menu" size={16} />
                </span>
              )}
              <span className="media-tile-caption">
                <span>{index + 1}</span>
                {label}
              </span>
              {canReorder && target === image.id && (
                <span className="media-drop-position">
                  {t("drop", index + 1)}
                </span>
              )}
            </button>
          );
        })}
      </div>
      <p className="media-order-status" role="status">
        {message}
      </p>
    </div>
  );
}

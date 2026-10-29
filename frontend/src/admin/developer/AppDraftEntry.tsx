/** Description and pattern entry share draft replacement confirmation before starting the existing workbench. */
import { useRef, useState } from "react";
import AppAssistant from "./AppAssistant";
import ConfirmDialog from "../../shared/ui/ConfirmDialog";
import { useAssistantText } from "../../shared/i18n/app-assistant-i18n";
import type { AppStudio } from "./useAppStudio";
import { startDescribedApp } from "./start-described-app";
export default function AppDraftEntry({
  studio,
  show,
  onReady,
  onClose,
}: {
  studio: AppStudio;
  show: Parameters<typeof startDescribedApp>[1];
  onReady: () => void;
  onClose: () => void;
}) {
  const pending = useRef<(() => void) | null>(null),
    [replace, setReplace] = useState(false);
  const { t } = useAssistantText();
  return (
    <>
      <AppAssistant
        onClose={onClose}
        onCreate={(draft, brief) => {
          const apply = () =>
            void startDescribedApp(studio, show, draft, brief, onReady);
          if (studio.dirty && studio.history.past.length > 0) {
            pending.current = apply;
            setReplace(true);
          } else apply();
        }}
      />
      {replace && (
        <ConfirmDialog
          title={t("draftWarning")}
          confirmLabel={t("create")}
          onCancel={() => setReplace(false)}
          onConfirm={() => {
            pending.current?.();
            setReplace(false);
          }}
        >
          <p>{t("draftWarningHint")}</p>
        </ConfirmDialog>
      )}
    </>
  );
}

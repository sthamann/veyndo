/** A merchant brief begins in an owned private stage and uses the existing reviewed app agent. */
import type { AppStudio } from "./useAppStudio";
import type { Manifest } from "../../shared/apps/native/types";
import { contentText } from "../../shared/i18n/content-language";
export async function startDescribedApp(
  studio: AppStudio,
  show: (
    prompt: string,
    target: { app: string; mode: "compose"; environment?: string },
  ) => void,
  draft: Manifest,
  brief: string | undefined,
  ready: () => void,
) {
  const start = () => {
    studio.startDraft(draft);
    ready();
  };
  if (!brief) {
    start();
    return;
  }
  await studio.run(async () => {
    const environment =
      studio.env ||
      (await studio.createSandbox(
        contentText(draft.name, studio.mainLocale, studio.mainLocale),
      ));
    if (!environment) return; // A changed account invalidated the asynchronous creation.
    start();
    show(brief, { app: draft.id, mode: "compose", environment });
  });
}

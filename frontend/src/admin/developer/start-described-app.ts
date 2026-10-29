/** A merchant brief begins in an owned private stage and uses the existing reviewed app agent. */
import type { AppStudio } from "./useAppStudio";
import type { Manifest } from "../../shared/apps/native/types";
export async function startDescribedApp(
  studio: AppStudio,
  show: (
    prompt: string,
    target: { app: string; mode: "compose"; environment?: string },
  ) => void,
  draft: Manifest,
  brief: string | undefined,
  ready: () => void,
  sandboxName: string,
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
    const environment = studio.env || (await studio.createSandbox(sandboxName));
    if (!environment) return; // A changed account invalidated the asynchronous creation.
    start();
    show(brief, { app: draft.id, mode: "compose", environment });
  });
}

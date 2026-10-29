/** Native asset editors use the existing asset owner; generated actions remain explicit capabilities in the package. */
import type { Manifest, Action } from "../../shared/apps/native/types";
import nativeAssetActions from "../../../../extensions/sdk/native-asset-actions.json";
export const assetActions: Action[] = nativeAssetActions as Action[];
export function addAssetActions(m: Manifest) {
  if (
    !m.entities.some((e) =>
      e.fields.some((f) => ["image", "file"].includes(f.kind)),
    )
  )
    return;
  m.permissions = [
    ...new Set([...m.permissions, "assets.read", "assets.write"]),
  ];
  for (const action of assetActions)
    if (!m.actions?.some((a) => a.handler === action.handler))
      (m.actions ??= []).push(action);
}

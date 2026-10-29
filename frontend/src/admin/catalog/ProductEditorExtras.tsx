/** Permission-filtered extension slots retain the current product context. */
import CoreExtensions, {
  type CoreExtensionData,
} from "../../shared/apps/CoreExtensions";
import { AppSurfaceSlot } from "../../shared/apps/AppSurfaces";
import type { RequestFn } from "../shell/studio-types";
export default function ProductEditorExtras({
  extensions,
  id,
  tab,
  request,
  selectedApp,
}: {
  extensions?: CoreExtensionData;
  id: string;
  tab: string;
  request: RequestFn;
  selectedApp: boolean;
}) {
  return (
    <>
      {id && tab === "general" && (
        <CoreExtensions objectId={id} {...extensions} request={request} />
      )}
      {id && tab === "general" && (
        <AppSurfaceSlot
          location="admin.product.general"
          context={{ productId: id }}
        />
      )}
      {id && !selectedApp && (
        <AppSurfaceSlot location="admin.product" context={{ productId: id }} />
      )}
    </>
  );
}

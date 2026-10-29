/** Composition mounts existing domain directories, filters and native entity editors without a second renderer. */
import { lazy, Suspense, useEffect, useState } from "react";
import CatalogDirectory from "../catalog/CatalogDirectory";
import OrderDirectory from "../orders/OrderDirectory";
import CustomerDirectory from "../customers/CustomerDirectory";
import type { Category } from "../catalog/catalog-model";
import type { GridQueryState, GridEntity } from "../../shared/grid/types";
import type { RequestFn } from "../shell/studio-types";
import { useCompositionText } from "./composition-i18n";
import type { OpenEntity } from "../shell/useEntityNavigation";
const ProductDataView = lazy(() => import("../catalog/ProductDataView"));
const CustomersManager = lazy(() => import("../customers/CustomersManager"));
const OrdersManager = lazy(() => import("../orders/OrdersManager"));

export default function AgentViewDirectory({
  entity,
  request,
  queryState,
  rights,
  selected,
  onSelect,
  headers,
  onDirtyChange,
  onEntity,
}: {
  onEntity: OpenEntity;
  onDirtyChange: (dirty: boolean) => void;
  entity: GridEntity;
  request: RequestFn;
  queryState: GridQueryState;
  rights: string[];
  selected?: string;
  onSelect: (id?: string) => void;
  headers: Record<string, string>;
}) {
  const t = useCompositionText();
  const [catalogue, setCatalogue] = useState<{
    request: RequestFn;
    categories: Category[];
    mainLocale: string;
  }>();
  useEffect(() => {
    let active = true;
    if (entity === "products")
      request("/api/merchant/categories")
        .then((v) => {
          if (active)
            setCatalogue({
              request,
              categories: v.elements,
              mainLocale: v.mainLocale ?? "en-GB",
            });
        })
        .catch(() => {
          if (active) setCatalogue(undefined);
        });
    return () => {
      active = false;
    };
  }, [entity, request]);
  if (selected)
    return (
      <Suspense fallback={<p role="status">{t("loading")}</p>}>
        {entity === "products" ? (
          <ProductDataView
            onEntity={onEntity}
            onDirtyChange={onDirtyChange}
            key={selected}
            request={request}
            initialId={selected}
            canWrite={rights.includes("catalog.write")}
            onEntityBack={() => onSelect(undefined)}
          />
        ) : entity === "orders" ? (
          <OrdersManager
            onEntity={onEntity}
            onDirtyChange={onDirtyChange}
            key={selected}
            request={request}
            headers={headers}
            initialId={selected}
            onEntityBack={() => onSelect(undefined)}
          />
        ) : (
          <CustomersManager
            onEntity={onEntity}
            onDirtyChange={onDirtyChange}
            key={selected}
            request={request}
            initialEmail={selected}
            onEntityBack={() => onSelect(undefined)}
          />
        )}
      </Suspense>
    );
  if (entity === "orders")
    return (
      <OrderDirectory
        request={request}
        queryState={queryState}
        rights={rights}
        onOpen={onSelect}
      />
    );
  if (entity === "customers")
    return (
      <CustomerDirectory
        request={request}
        queryState={queryState}
        groups={[]}
        groupName={(id) => id}
        onOpen={onSelect}
      />
    );
  return (
    <CatalogDirectory
      request={request}
      queryState={queryState}
      onOpen={onSelect}
      categories={catalogue?.request === request ? catalogue.categories : []}
      mainLocale={
        catalogue?.request === request ? catalogue.mainLocale : "en-GB"
      }
      canWrite={false}
      onNew={() => {}}
    />
  );
}

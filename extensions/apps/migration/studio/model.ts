/** Review projections retain exact minor units and source IDs; UI never invents native purchase or identity authority. */
export type Kind =
  | "products"
  | "categories"
  | "pages"
  | "customers"
  | "orders"
  | "assets"
  | "reviews"
  | "coupons";
export type SourceRecord = {
  sourceId: string;
  sourceShop?: string;
  kind: Kind;
  warnings: string[];
  data: {
    name?: Record<string, string>;
    title?: Record<string, string> | string;
    destination?: {
      amount: number;
      kind: string;
      maxUses?: number | null;
      end?: string | null;
    };
    code?: string;
    currency?: string;
    sourceRules?: Record<string, string | number | boolean | null>;
    text?: string;
    rating?: number;
    sourceAuthor?: string;
    createdAt?: string;
    sourceVerified?: boolean | null;
    firstName?: string;
    lastName?: string;
    number?: string;
    sku?: string;
    price?: { currency: string; scale: number; minor: number };
    total?: { currency: string; scale: number; minor: number };
    stock?: number;
    parentSourceId?: string | null;
    variantGroup?: boolean;
    catalogActive?: boolean | null;
    options?: Record<string, string>;
    url?: string;
    byteLength?: number;
    priceDisplay?: string;
    totalDisplay?: string;
  };
};
export type Review = {
  records: SourceRecord[];
  recordDigests: string[];
  sourceId: string;
  sourceVersion: string;
  kind: Kind;
  nextCursor?: string;
  adapterVersion: number;
  cursor?: string;
};
export type Job = {
  id: string;
  action?: string;
  status:
    | "queued"
    | "running"
    | "succeeded"
    | "failed"
    | "uncertain"
    | "cancelled"
    | "cancel_requested";
  progress: number;
  revision: number;
  message: Record<string, string>;
  result?: {
    target?: string;
    kind: Kind;
    sourceId: string;
    imported?: number;
    reviewed?: number;
    nextCursor?: string;
    reconciled?: boolean;
    records?: SourceRecord[];
    recordDigests?: string[];
    sourceVersion?: string;
    adapterVersion?: number;
    cursor?: string;
  };
};
export function jobKind(job: Job): Kind | undefined {
  const kind = job.result?.kind ?? job.action?.replace(/^(import|review)_/, "");
  return [
    "products",
    "assets",
    "categories",
    "pages",
    "customers",
    "orders",
    "reviews",
    "coupons",
  ].includes(kind ?? "")
    ? (kind as Kind)
    : undefined;
}
export function rowName(row: SourceRecord) {
  return (
    (typeof row.data.title === "string"
      ? row.data.title
      : Object.values(row.data.name ?? row.data.title ?? {})[0]) ||
    row.data.code ||
    row.data.number ||
    [row.data.firstName, row.data.lastName].filter(Boolean).join(" ") ||
    row.sourceId
  );
}
export function rowAmount(row: SourceRecord) {
  if (row.kind === "coupons")
    return `${row.data.destination?.amount ?? ""} ${row.data.destination?.kind === "percentage" ? "%" : (row.data.currency ?? "")}`.trim();
  const a = row.data.price ?? row.data.total;
  if (!a) return "";
  const text = row.data.priceDisplay ?? row.data.totalDisplay;
  if (text) return `${text} ${a.currency}`;
  if (!Number.isSafeInteger(a.minor)) return "";
  const digits = String(Math.abs(a.minor)).padStart(a.scale + 1, "0");
  return `${a.minor < 0 ? "-" : ""}${a.scale ? digits.slice(0, -a.scale) + "." + digits.slice(-a.scale) : digits} ${a.currency}`;
}
export function importRights(kind: Kind) {
  return [
    "apps.manage",
    kind === "coupons"
      ? "automation.manage"
      : kind === "reviews"
        ? "catalog.write"
        : kind === "pages"
          ? "channels.manage"
          : isPrivate(kind)
            ? "catalog.write"
            : kind === "customers"
              ? "customers.write"
              : "orders.write",
    ...(isPrivate(kind)
      ? ["environments.manage"]
      : kind === "coupons"
        ? []
        : ["customers.pii"]),
  ];
}

export function isPrivate(kind: Kind) {
  return (
    kind === "products" ||
    kind === "categories" ||
    kind === "pages" ||
    kind === "assets"
  );
}

export function importOptions(
  kind: Kind,
  values: {
    tax: string;
    group: string;
    mainLocale: string;
    destinationDigest?: string;
  },
) {
  switch (kind) {
    case "products":
      return { channelId: "default", taxRate: Number(values.tax) };
    case "pages":
      return { destinationDigest: values.destinationDigest };
    case "reviews":
    case "coupons":
    case "categories":
    case "assets":
      return {};
    case "customers":
      return { customerGroup: values.group };
    case "orders":
      return { channelId: "default", locale: values.mainLocale };
  }
}

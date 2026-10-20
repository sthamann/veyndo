/** Generated native operation input contracts; do not edit. */
/** Native input DTOs; opaque JSON fields remain explicit. */
import type { JsonValue } from "./value";
export interface Inputs10 {
  "merchant.app.history": {
    app: string;
    approve?: boolean;
    entity: string;
    id: string;
    revision?: number;
    version?: number;
  };
  "merchant.app.restore": {
    app: string;
    approve: boolean;
    entity: string;
    id: string;
    revision: number;
    version: number;
  };
  "merchant.site.task": {
    agent?: "codex" | "claude_code";
    id: string;
    instruction: string;
    revision: number;
    selected?: string;
  };
  "merchant.site.propose": {
    fields: JsonValue;
    id: string;
    instruction: string;
    revision: number;
    selected?: string;
    summary?: string;
  };
  "merchant.site.plan": {
    content?: boolean;
    id: string;
    images?: Array<string>;
    instruction: string;
    revision: number;
    selected?: string;
    structure?: boolean;
    style?: boolean;
    urls?: Array<string>;
  };
  "merchant.site.apply": { approve: boolean; taskId: string };
  "studio.workspace.work.read": JsonValue;
  "studio.workspace.read": JsonValue;
  "studio.workspace.save": { data: JsonValue; revision: number };
  "merchant.import.inspect": {
    details?: boolean;
    options: {
      acknowledgedWarnings?: Array<string>;
      channelId?: string;
      customerGroup?: string;
      destinationDigest?: string;
      locale?: string;
      sourcePriceBasis?: "gross" | "net";
      taxRate?: number;
    };
    record: {
      data: JsonValue;
      kind:
        | "products"
        | "categories"
        | "pages"
        | "customers"
        | "orders"
        | "assets"
        | "reviews"
        | "coupons";
      source: string;
      sourceId: string;
      sourceShop: string;
      version: 1;
      warnings: Array<string>;
    };
  };
  "merchant.import.record": {
    approve: boolean;
    assetChunks?: Array<string>;
    options: {
      acknowledgedWarnings?: Array<string>;
      channelId?: string;
      customerGroup?: string;
      destinationDigest?: string;
      locale?: string;
      sourcePriceBasis?: "gross" | "net";
      taxRate?: number;
    };
    record: {
      data: JsonValue;
      kind:
        | "products"
        | "categories"
        | "pages"
        | "customers"
        | "orders"
        | "assets"
        | "reviews"
        | "coupons";
      source: string;
      sourceId: string;
      sourceShop: string;
      version: 1;
      warnings: Array<string>;
    };
  };
  "merchant.customer.creation": JsonValue;
}

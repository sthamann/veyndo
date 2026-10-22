/** Generated native operation input contracts; do not edit. */
/** Native input DTOs; opaque JSON fields remain explicit. */
import type { JsonValue } from "./value";
export interface Inputs10 {
  "knowledge.claim.review": {
    approve?: boolean;
    id?: string;
    revision?: number;
    state?: "evidenced" | "confirmed" | "rejected";
  };
  "knowledge.extract": {
    inference?: JsonValue;
    locale?: string;
    productId?: string;
    sourceId?: string;
  };
  "knowledge.compile": {
    claims?: Array<{ id: string; text: string }>;
    productId?: string;
  };
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
}

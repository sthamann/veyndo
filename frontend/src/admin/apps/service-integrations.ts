/** Installed provider UI capabilities come from their app packages, not an alternate commerce registry. */
import vercel from "../../../../extensions/apps/vercel/studio/connector.json";
import klaviyo from "../../../../extensions/apps/klaviyo/studio/connector.json";
import hubspot from "../../../../extensions/apps/hubspot/studio/connector.json";
import contentful from "../../../../extensions/apps/contentful/studio/connector.json";
import algolia from "../../../../extensions/apps/algolia/studio/connector.json";
export const serviceIntegrations: Record<
  string,
  {
    id: string;
    name: string;
    fields: string[];
    operation: string[];
    summary: string[];
  }
> = { vercel, klaviyo, hubspot, contentful, algolia };

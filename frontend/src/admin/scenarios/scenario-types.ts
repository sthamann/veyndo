/** Safe public projections; cart tokens and provider checkpoints are never part of this contract. */
export type Profile = {
  id: string;
  name: string;
  goal: string;
  budgetMinor: number;
  locale: string;
  country: string;
};
export type Scenario = {
  id: string;
  title: string;
  members: number;
  updatedAt?: string;
};
export type Finding = {
  profile: Profile;
  outcome: string;
  orderId?: string;
  totalMinor?: number;
  currency?: string;
  scale?: number;
  comparisonDigest?: string;
  snapshotDigest?: string;
  steps: {
    index: number;
    action: string;
    reason: string;
    error?: { detail: string };
    observation?: unknown;
  }[];
};
export type Run = {
  taskId: string;
  state: string;
  revision: number;
  scenario?: {
    profile: Profile;
    instruction: string;
    index: number;
    currency: string;
    scale: number;
    channel: string;
    inference?: { provider: string; model?: string };
    comparisonDigest?: string;
    steps?: Finding["steps"];
  };
  preview?: { scenario: Finding };
  error?: { detail: string };
};
export type Report = { id: string; runs: Run[] };
export type Configuration = {
  channel: string;
  mainLocale: string;
  locales: string[];
  countries: string[];
  currency: string;
  scale: number;
};

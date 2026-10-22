/** Keep every scenario entry aligned with the native compound admission. */
export const scenarioRights = [
  "assistant.use",
  "catalog.read",
  "channels.read",
  "environments.manage",
  "orders.write",
  "orders.read",
  "knowledge.read",
];
export const canTestCustomers = (rights: string[]) =>
  scenarioRights.every((right) => rights.includes(right));

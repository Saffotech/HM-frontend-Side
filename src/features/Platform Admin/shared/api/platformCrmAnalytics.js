import { platformApi } from "./platformClient.js";

export { CRM_ANALYTICS_STATUSES, mapCrmAnalytics } from "./platformCatalogModel.js";

/** GET /platform/crm/analytics. Company-wide lead counts. Does not replace GET /crm/leads. */
export function getCrmAnalytics() {
  return platformApi("/platform/crm/analytics");
}

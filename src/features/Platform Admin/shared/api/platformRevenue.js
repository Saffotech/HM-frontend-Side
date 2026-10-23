import { platformApi } from "./platformClient.js";

export { mapPlatformRevenue, revenueSnapshot } from "./platformCatalogModel.js";

/** GET /platform/revenue. Company-wide subscription invoice totals. */
export function getPlatformRevenue() {
  return platformApi("/platform/revenue");
}

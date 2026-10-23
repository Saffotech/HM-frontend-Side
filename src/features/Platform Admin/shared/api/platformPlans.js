import { platformApi } from "./platformClient.js";

export {
  activePlanNames,
  catalogPrice,
  cyclesForPlan,
  mapPlatformPlans,
} from "./platformCatalogModel.js";

/** GET /platform/plans. Catalog rows for the plan screen and plan dropdowns. */
export function listPlatformPlans() {
  return platformApi("/platform/plans");
}

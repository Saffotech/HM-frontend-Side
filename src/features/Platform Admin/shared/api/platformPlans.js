import { platformApi } from "./platformClient.js";
import { createPlanBody, updatePlanBody } from "./platformCatalogModel.js";

export {
  activePlanNames,
  catalogPrice,
  cyclesForPlan,
  createPlanBody,
  mapPlatformPlans,
  updatePlanBody,
} from "./platformCatalogModel.js";

/** GET /platform/plans. Catalog rows for the plan screen and plan dropdowns. */
export function listPlatformPlans() {
  return platformApi("/platform/plans");
}

/** POST /platform/plans. Creates a plan using the backend's default annual factor when omitted. */
export function createPlatformPlan(values) {
  return platformApi("/platform/plans", {
    method: "POST",
    body: JSON.stringify(createPlanBody(values)),
  });
}

/** PATCH /platform/plans/{plan_id}. Only supported values that changed are sent. */
export function updatePlatformPlan(planId, current, values) {
  return platformApi(`/platform/plans/${encodeURIComponent(planId)}`, {
    method: "PATCH",
    body: JSON.stringify(updatePlanBody(current, values)),
  });
}

/** POST /platform/plans/{plan_id}/deactivate. Hides the plan from new subscriptions. */
export function deactivatePlatformPlan(planId) {
  return platformApi(`/platform/plans/${encodeURIComponent(planId)}/deactivate`, {
    method: "POST",
  });
}

/** POST /platform/plans/{plan_id}/activate. Reactivates an existing inactive plan. */
export function activatePlatformPlan(planId) {
  return platformApi(`/platform/plans/${encodeURIComponent(planId)}/activate`, {
    method: "POST",
  });
}

/** DELETE /platform/plans/{plan_id}. Success is 204 with no plan body. */
export function deletePlatformPlan(planId) {
  return platformApi(`/platform/plans/${encodeURIComponent(planId)}`, {
    method: "DELETE",
  });
}

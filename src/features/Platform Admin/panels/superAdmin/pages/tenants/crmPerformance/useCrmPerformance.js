import { useMemo } from "react";
import { usePlatform } from "../../../../../shared/context/PlatformContext";
import { PORTAL_USERS } from "../../../../../shared/data/portalUsers";
import { todayInput } from "../../../../../shared/utils/formatDate";
import { LEAD_SOURCES } from "../../../../crm/utils/crmLeads";
import { buildCrmPerformance } from "./metrics";
import { resolvePeriod } from "../../../../../shared/utils/periods";

// Only the name/role/portal of portal users is needed to label employees; credentials are never passed on.
const CRM_USERS = PORTAL_USERS.map(({ name, role, portal }) => ({ name, role, portal }));

/**
 * Single data source for the CRM performance dashboard.
 * When the backend exists, replace the body with a fetch of GET /platform/crm/analytics using the same filters
 * and keep the returned shape (see metrics.js).
 */
export function useCrmPerformance(filters) {
  const { onboarding, hospitals, invoices } = usePlatform();
  const today = todayInput();
  return useMemo(() => {
    const period = resolvePeriod(filters.preset, { start: filters.start, end: filters.end }, today);
    return buildCrmPerformance({ onboarding, hospitals, invoices, crmUsers: CRM_USERS, filters, period, today });
  }, [filters, hospitals, invoices, onboarding, today]);
}

/** Filter options come from the data so new employees, plans and sources appear automatically. */
export function useCrmFilterOptions() {
  const { onboarding, plans } = usePlatform();
  return useMemo(() => ({
    employees: [...new Set([
      ...CRM_USERS.filter((user) => user.portal === "crm").map((user) => user.name),
      ...onboarding.map((lead) => lead.assignedTo).filter(Boolean),
    ])].sort(),
    plans: plans.map((plan) => plan.name),
    sources: [...new Set([...LEAD_SOURCES, ...onboarding.map((lead) => lead.source).filter(Boolean)])],
  }), [onboarding, plans]);
}

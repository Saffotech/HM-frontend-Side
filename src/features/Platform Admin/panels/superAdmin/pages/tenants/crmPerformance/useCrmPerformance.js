import { useEffect, useMemo, useState } from "react";
import { listLeads, mapLeadList } from "../../../../../shared/api/leadApi";
import { interpretPlatformError } from "../../../../../shared/api/platformErrors";
import { listTenants } from "../../../../../shared/api/registrationApi";
import { PLAN_NAMES } from "../../../../../shared/data/catalog";
import { usePlatform } from "../../../../../shared/context/PlatformContext";
import { todayInput } from "../../../../../shared/utils/formatDate";
import { LEAD_SOURCES } from "../../../../crm/utils/crmLeads";
import { buildCrmPerformance } from "./metrics";
import { resolvePeriod } from "../../../../../shared/utils/periods";

function hospitalFromTenant(tenant) {
  if (tenant?.tenant_id == null) return null;
  return {
    id: tenant.tenant_id,
    name: tenant.name || "",
    code: tenant.code || "",
    plan: tenant.plan || "",
    billingCycle: tenant.billing_cycle || "",
    subscriptionStatus: tenant.subscription_status || "",
    isActive: tenant.is_active,
  };
}

/**
 * Leads come from GET /crm/leads. Hospitals come from GET /tenants.
 * Invoices stay empty: this platform-admin page cannot call GET /platform/invoices.
 */
export function useCrmPerformance(filters) {
  const { sessionFor } = usePlatform();
  const session = sessionFor("platform");
  const today = todayInput();
  const [onboarding, setOnboarding] = useState([]);
  const [hospitals, setHospitals] = useState([]);
  const [hospitalError, setHospitalError] = useState("");

  useEffect(() => {
    let active = true;
    listLeads()
      .then((body) => {
        if (!active) return;
        const rows = mapLeadList(Array.isArray(body) ? body : body?.items || body?.leads || [], session);
        setOnboarding(rows);
      })
      .catch(() => {
        if (active) setOnboarding([]);
      });
    return () => { active = false; };
  }, [session]);

  useEffect(() => {
    let active = true;
    listTenants()
      .then((body) => {
        if (!active) return;
        const rows = Array.isArray(body) ? body : [];
        setHospitals(rows.map(hospitalFromTenant).filter(Boolean));
        setHospitalError("");
      })
      .catch((err) => {
        if (!active) return;
        setHospitals([]);
        setHospitalError(interpretPlatformError(err).toast);
      });
    return () => { active = false; };
  }, []);

  return useMemo(() => {
    const period = resolvePeriod(filters.preset, { start: filters.start, end: filters.end }, today);
    return {
      ...buildCrmPerformance({
        onboarding,
        hospitals,
        invoices: [],
        crmUsers: [],
        filters,
        period,
        today,
      }),
      hospitalError,
      billingNote: "Revenue stays at zero on this page. Platform invoices are an accountant permission, so paid amounts are not loaded or estimated.",
    };
  }, [filters, hospitalError, hospitals, onboarding, today]);
}

/** Filter options come from the lead list and the plan catalog. */
export function useCrmFilterOptions() {
  const { sessionFor } = usePlatform();
  const session = sessionFor("platform");
  const [onboarding, setOnboarding] = useState([]);

  useEffect(() => {
    let active = true;
    listLeads()
      .then((body) => {
        if (!active) return;
        setOnboarding(mapLeadList(Array.isArray(body) ? body : body?.items || body?.leads || [], session));
      })
      .catch(() => {
        if (active) setOnboarding([]);
      });
    return () => { active = false; };
  }, [session]);

  return useMemo(() => ({
    employees: [...new Set(onboarding.map((lead) => lead.assignedTo).filter(Boolean))].sort(),
    plans: PLAN_NAMES,
    sources: [...new Set([...LEAD_SOURCES, ...onboarding.map((lead) => lead.source).filter(Boolean)])],
  }), [onboarding]);
}

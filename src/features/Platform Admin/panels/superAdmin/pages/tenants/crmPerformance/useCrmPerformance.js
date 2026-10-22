import { useCallback, useEffect, useMemo, useState } from "react";
import { listLeads, parseLeadList } from "../../../../../shared/api/leadApi";
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
const EMPTY_LEADS = [];

export function useCrmPerformance(filters) {
  const { sessionFor } = usePlatform();
  const session = sessionFor("platform");
  const today = todayInput();
  const [leadAttempt, setLeadAttempt] = useState(0);
  const [leadStatus, setLeadStatus] = useState("loading");
  const [leadError, setLeadError] = useState("");
  const [onboarding, setOnboarding] = useState(EMPTY_LEADS);
  const [hospitals, setHospitals] = useState([]);
  const [hospitalError, setHospitalError] = useState("");
  const retryLeads = useCallback(() => setLeadAttempt((current) => current + 1), []);

  useEffect(() => {
    let active = true;
    setLeadStatus("loading");
    setLeadError("");
    listLeads()
      .then((body) => {
        if (!active) return;
        const parsed = parseLeadList(body, session);
        if (!parsed.ok) {
          setOnboarding(EMPTY_LEADS);
          setLeadStatus("error");
          setLeadError(parsed.error);
          return;
        }
        setOnboarding(parsed.rows);
        setLeadStatus("ready");
        setLeadError("");
      })
      .catch((err) => {
        if (!active) return;
        setOnboarding(EMPTY_LEADS);
        setLeadStatus("error");
        setLeadError(interpretPlatformError(err).toast || "CRM leads could not be loaded.");
      });
    return () => { active = false; };
  }, [leadAttempt, session]);

  useEffect(() => {
    let active = true;
    listTenants()
      .then((body) => {
        if (!active) return;
        if (!Array.isArray(body)) {
          setHospitals([]);
          setHospitalError("Hospital list response was not a list.");
          return;
        }
        setHospitals(body.map(hospitalFromTenant).filter(Boolean));
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
    const base = {
      leadStatus,
      leadError,
      leads: leadStatus === "ready" ? onboarding : EMPTY_LEADS,
      hospitalError,
      retryLeads,
    };
    if (leadStatus !== "ready") return base;
    const period = resolvePeriod(filters.preset, { start: filters.start, end: filters.end }, today);
    return {
      ...base,
      ...buildCrmPerformance({
        onboarding,
        hospitals,
        invoices: [],
        crmUsers: [],
        filters,
        period,
        today,
      }),
    };
  }, [filters, hospitalError, hospitals, leadError, leadStatus, onboarding, retryLeads, today]);
}

/** Filter options come from a successful lead list and the plan catalog. */
export function useCrmFilterOptions(leads, ready) {
  const rows = Array.isArray(leads) ? leads : EMPTY_LEADS;
  return useMemo(() => ({
    employees: ready ? [...new Set(rows.map((lead) => lead.assignedTo).filter(Boolean))].sort() : [],
    plans: PLAN_NAMES,
    sources: [...new Set([...LEAD_SOURCES, ...(ready ? rows.map((lead) => lead.source).filter(Boolean) : [])])],
  }), [ready, rows]);
}

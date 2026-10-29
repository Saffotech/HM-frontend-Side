import { useCallback, useEffect, useMemo, useState } from "react";
import { getCrmPerformance, parseCrmPerformance } from "../../../../../shared/api/platformCrmPerformance";
import { interpretPlatformError, platformCallMessage, shouldEndPlatformSession } from "../../../../../shared/api/platformErrors";
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
 * Employee performance comes from GET /platform/crm/performance.
 * Hospital subscription status still comes from GET /tenants.
 */
const EMPTY_LEADS = [];
const EMPTY_USERS = [];
const EMPTY_INVOICES = [];

export function useCrmPerformance(filters) {
  const { sessionFor, signOutPortal } = usePlatform();
  const session = sessionFor("platform");
  const today = todayInput();
  const [leadAttempt, setLeadAttempt] = useState(0);
  const [leadStatus, setLeadStatus] = useState("loading");
  const [leadError, setLeadError] = useState("");
  const [onboarding, setOnboarding] = useState(EMPTY_LEADS);
  const [crmUsers, setCrmUsers] = useState(EMPTY_USERS);
  const [invoices, setInvoices] = useState(EMPTY_INVOICES);
  const [hospitals, setHospitals] = useState([]);
  const [hospitalError, setHospitalError] = useState("");
  const retryLeads = useCallback(() => setLeadAttempt((current) => current + 1), []);

  useEffect(() => {
    let active = true;
    setLeadStatus("loading");
    setLeadError("");
    getCrmPerformance()
      .then((body) => {
        if (!active) return;
        const parsed = parseCrmPerformance(body, session);
        if (!parsed.ok) {
          setOnboarding(EMPTY_LEADS);
          setCrmUsers(EMPTY_USERS);
          setInvoices(EMPTY_INVOICES);
          setLeadStatus("error");
          setLeadError(parsed.error);
          return;
        }
        setOnboarding(parsed.onboarding);
        setCrmUsers(parsed.crmUsers);
        setInvoices(parsed.invoices);
        setLeadStatus("ready");
        setLeadError("");
      })
      .catch((err) => {
        if (!active) return;
        setOnboarding(EMPTY_LEADS);
        setCrmUsers(EMPTY_USERS);
        setInvoices(EMPTY_INVOICES);
        setLeadStatus("error");
        setLeadError(platformCallMessage(err) || "CRM performance could not be loaded.");
        if (shouldEndPlatformSession(err)) signOutPortal("platform");
      });
    return () => { active = false; };
  }, [leadAttempt, session, signOutPortal]);

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
    const ready = leadStatus === "ready";
    const base = {
      leadStatus,
      leadError,
      leads: ready ? onboarding : EMPTY_LEADS,
      employeeNames: ready ? crmUsers.map((user) => user.name) : [],
      hospitalError,
      retryLeads,
    };
    if (!ready) return base;
    const period = resolvePeriod(filters.preset, { start: filters.start, end: filters.end }, today);
    return {
      ...base,
      ...buildCrmPerformance({
        onboarding,
        hospitals,
        invoices,
        crmUsers,
        filters,
        period,
        today,
      }),
    };
  }, [crmUsers, filters, hospitalError, hospitals, invoices, leadError, leadStatus, onboarding, retryLeads, today]);
}

/** Filter options come from the performance dataset and the plan catalog. */
export function useCrmFilterOptions(leads, ready, employeeNames = []) {
  const rows = Array.isArray(leads) ? leads : EMPTY_LEADS;
  return useMemo(() => {
    const roster = Array.isArray(employeeNames) ? employeeNames : [];
    return {
      employees: ready ? [...new Set([
        ...rows.map((lead) => lead.assignedTo).filter(Boolean),
        ...roster.filter(Boolean),
      ])].sort() : [],
      plans: PLAN_NAMES,
      sources: [...new Set([...LEAD_SOURCES, ...(ready ? rows.map((lead) => lead.source).filter(Boolean) : [])])],
    };
  }, [employeeNames, ready, rows]);
}

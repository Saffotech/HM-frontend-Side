import { createContext, useContext, useMemo } from "react";
import { auditLogsSeed } from "../data/auditLogsData";
import { profileSeed, settingsSeed } from "../data/dashboardData";
import { invoicesSeed } from "../data/invoicesData";
import { notificationsSeed } from "../data/notificationsData";
import { plansSeed } from "../data/plansData";
import { CONTACT_METHODS, hospitalsSeed, onboardingSeed } from "../data/tenantsData";
import { useLocalStorage } from "../hooks/useLocalStorage";
import { findPortalUser } from "../data/portalUsers";
import { ACCOUNTS_BASE, CRM_BASE } from "../paths";
import { formatDate } from "../utils/formatDate";
import { createHospitalRecord } from "../utils/hospitals";
import { subscriptionIdFromTenant } from "../utils/invoices";
import { nextNumberedId } from "../utils/table";

const PlatformContext = createContext(null);
const STORAGE_KEY = "saffocare.platform.v1";

const SESSION_KEYS = {
  platform: "platformSession",
  crm: "crmSession",
  accountant: "accountsSession",
};

const PORTAL_LABELS = {
  platform: "Platform Admin",
  crm: "CRM",
  accountant: "Accountant",
};

const OPEN_REQUEST_STATUSES = ["New", "Contacted"];
const EDITABLE_LEAD_LABELS = {
  priority: "priority",
  contactPerson: "contact person",
  designation: "designation",
  contactPhone: "phone",
  contactEmail: "contact email",
  hospitalEmail: "hospital email",
  city: "city",
  state: "state",
  type: "hospital type",
  plan: "plan",
  billingCycle: "billing cycle",
  source: "source",
};
const EDITABLE_LEAD_FIELDS = Object.keys(EDITABLE_LEAD_LABELS);
// Name, email, role and user ID are system-controlled: CRM ownership is keyed by name and sign-in by email.
const EDITABLE_PROFILE_FIELDS = ["phone", "jobTitle", "department"];
// Profile photos must come from the photo service; image data is never kept in localStorage.
const withoutStoredPhoto = (saved) => Object.fromEntries(Object.entries(saved).filter(([field]) => field !== "photo"));

function createDefaultState() {
  return {
    version: 13,
    platformSession: null,
    crmSession: null,
    accountsSession: null,
    hospitals: hospitalsSeed,
    onboarding: onboardingSeed,
    plans: plansSeed,
    invoices: invoicesSeed,
    auditLogs: auditLogsSeed,
    notifications: notificationsSeed,
    settings: settingsSeed,
    profile: profileSeed,
  };
}

function presentOnboarding(list) {
  if (!Array.isArray(list) || list.some((item) => !Array.isArray(item?.activity))) return onboardingSeed;
  const seedById = new Map(onboardingSeed.map((item) => [item.id, item]));
  return list.map((item) => {
    const seed = seedById.get(item.id);
    const fill = (key) => (Object.prototype.hasOwnProperty.call(item, key) ? item[key] : (seed?.[key] || ""));
    return {
      ...item,
      priority: item.priority || seed?.priority || "Medium",
      nextAction: fill("nextAction"),
      registeredBy: fill("registeredBy"),
      agreedAt: fill("agreedAt"),
      agreedBy: fill("agreedBy"),
      handoverNote: fill("handoverNote"),
      closeNote: fill("closeNote"),
      closedBy: fill("closedBy"),
      closedAt: fill("closedAt"),
    };
  });
}

const isWithin = (path, base) => path === base || path.startsWith(`${base}/`);

function actingName(state) {
  const path = typeof window === "undefined" ? "" : window.location.pathname;
  if (isWithin(path, CRM_BASE) && state.crmSession?.name) return state.crmSession.name;
  if (isWithin(path, ACCOUNTS_BASE) && state.accountsSession?.name) return state.accountsSession.name;
  return state.platformSession?.name || state.profile.name;
}

function withAudit(state, entry) {
  return {
    ...state,
    auditLogs: [
      {
        id: nextNumberedId("AUD", state.auditLogs),
        timestamp: new Date().toISOString(),
        actor: actingName(state),
        result: "Success",
        tenant: "Platform",
        resource: "Platform",
        ...entry,
      },
      ...state.auditLogs,
    ],
  };
}

export function PlatformProvider({ children }) {
  const [state, setState] = useLocalStorage(STORAGE_KEY, createDefaultState);

  const commit = (next, entry) => setState(entry ? withAudit(next, entry) : next);
  const onboardingList = useMemo(() => presentOnboarding(state.onboarding), [state.onboarding]);
  const hospitalList = useMemo(() => (state.hospitals || []).map((hospital) => ({
    ...hospital,
    subscriptionId: hospital.subscriptionId || subscriptionIdFromTenant(hospital.id),
  })), [state.hospitals]);
  const invoiceList = useMemo(() => (state.invoices || []).map((invoice) => ({
    ...invoice,
    subscriptionId: invoice.subscriptionId || subscriptionIdFromTenant(invoice.tenantId),
  })), [state.invoices]);

  // A CRM employee may only change leads assigned to them; the backend must enforce the same rule.
  const canEditRequest = (request) => {
    const path = typeof window === "undefined" ? "" : window.location.pathname;
    if (!isWithin(path, CRM_BASE)) return true;
    return Boolean(state.crmSession?.name) && request.assignedTo === state.crmSession.name;
  };

  const updateRequest = (id, update, action, allowedStatuses) => {
    const request = onboardingList.find((item) => item.id === id);
    if (!request || !canEditRequest(request)) return false;
    if (allowedStatuses && !allowedStatuses.includes(request.status)) return false;
    const changes = update(request);
    if (!Object.keys(changes).length) return true;
    const onboarding = onboardingList.map((item) => (item.id === id ? { ...item, ...changes } : item));
    commit({ ...state, onboarding }, { action, tenant: request.hospitalName, resource: id });
    return true;
  };

  const activityEntry = (method, note, extra = {}) => ({
    at: new Date().toISOString(),
    by: actingName(state),
    method,
    note,
    ...extra,
  });
  const api = {
    ...state,
    hospitals: hospitalList,
    invoices: invoiceList,
    onboarding: onboardingList,
    sessionFor(portal) {
      const key = SESSION_KEYS[portal];
      return key ? state[key] || null : null;
    },
    /** @returns {import("../services/portalAccount").PortalProfileResponse & { signedInAt: string, previousSignInAt: string, updatedAt: string } | null} */
    portalProfile(portal) {
      const key = SESSION_KEYS[portal];
      const session = key ? state[key] : null;
      if (!session?.userId) return null;
      const saved = state.portalProfiles?.[session.userId] || {};
      return {
        userId: session.userId,
        name: session.name,
        email: session.email,
        role: session.role,
        signedInAt: session.signedInAt || "",
        previousSignInAt: saved.previousSignInAt || "",
        updatedAt: saved.updatedAt || "",
        photoUrl: "",
        ...Object.fromEntries(EDITABLE_PROFILE_FIELDS.map((field) => [field, saved[field] || ""])),
      };
    },
    // Demo persistence only (this browser); production must PATCH the signed-in user's own record.
    saveMyProfile(portal, patch) {
      const key = SESSION_KEYS[portal];
      const session = key ? state[key] : null;
      if (!session?.userId) return false;
      const saved = state.portalProfiles?.[session.userId] || {};
      const changes = Object.fromEntries(EDITABLE_PROFILE_FIELDS
        .filter((field) => Object.prototype.hasOwnProperty.call(patch, field))
        .map((field) => [field, String(patch[field] ?? "").trim()]));
      const portalProfiles = {
        ...(state.portalProfiles || {}),
        [session.userId]: { ...withoutStoredPhoto(saved), ...changes, updatedAt: new Date().toISOString() },
      };
      commit({ ...state, portalProfiles }, { action: "Profile Updated", resource: session.email, actor: session.name });
      return true;
    },
    signInPortal(portal, email, password) {
      const key = SESSION_KEYS[portal];
      const user = key ? findPortalUser(portal, email, password) : null;
      if (!user) return "Email or password does not match this portal.";
      const now = new Date().toISOString();
      const saved = state.portalProfiles?.[user.id] || {};
      const next = {
        ...state,
        [key]: { userId: user.id, name: user.name, email: user.email, role: user.role, signedInAt: now },
        portalProfiles: {
          ...(state.portalProfiles || {}),
          [user.id]: { ...withoutStoredPhoto(saved), previousSignInAt: saved.lastSignInAt || "", lastSignInAt: now },
        },
      };
      setState(withAudit(next, { action: "Signed In", resource: user.role, actor: user.name }));
      return "";
    },
    signOutPortal(portal) {
      const key = SESSION_KEYS[portal];
      if (!key) return;
      const name = state[key]?.name || "Portal";
      commit({ ...state, [key]: null }, { action: "Signed Out", resource: PORTAL_LABELS[portal], actor: name });
    },
    addHospital(input, requestId) {
      const created = createHospitalRecord(input, state.plans, state.hospitals);
      const onboarding = requestId
        ? onboardingList.map((item) => (
          item.id === requestId
            ? {
              ...item,
              status: "Registered",
              hospitalId: created.id,
              registeredAt: new Date().toISOString(),
              assignedTo: item.assignedTo || actingName(state),
              registeredBy: actingName(state),
              activity: [activityEntry("Registration", `Registered as hospital ${created.id}.`), ...item.activity],
            }
            : item
        ))
        : onboardingList;
      commit(
        { ...state, onboarding, hospitals: [created, ...state.hospitals] },
        { action: "Hospital Registered", tenant: created.name, resource: created.id },
      );
      return created;
    },
    updateHospital(id, patch) {
      const hospitals = state.hospitals.map((hospital) => (
        hospital.id === id ? { ...hospital, ...patch, contactPerson: patch.adminName || hospital.contactPerson } : hospital
      ));
      const hospital = hospitals.find((item) => item.id === id);
      commit({ ...state, hospitals }, { action: "Tenant Updated", tenant: hospital?.name || id, resource: id });
    },
    setHospitalStatus(ids, status) {
      const selected = Array.isArray(ids) ? ids : [ids];
      const hospitals = state.hospitals.map((hospital) => {
        if (!selected.includes(hospital.id) || hospital.status === "Closed") return hospital;
        const subscriptionStatus = status === "Suspended" ? "Suspended" : hospital.trialPeriod !== "None" ? "Trial" : "Active";
        const plan = state.plans.find((item) => item.name === hospital.plan);
        const monthlyRecurring = status === "Active" && subscriptionStatus !== "Trial"
          ? (hospital.billingCycle === "Annual" ? Math.round(((plan?.price || 0) * 10) / 12) : plan?.price || 0)
          : 0;
        return { ...hospital, status, subscriptionStatus, monthlyRecurring };
      });
      const label = selected.length > 1 ? `${selected.length} tenants` : hospitals.find((item) => item.id === selected[0])?.name;
      commit(
        { ...state, hospitals },
        { action: status === "Suspended" ? "Tenant Suspended" : "Tenant Activated", tenant: label, resource: selected.join(", ") },
      );
    },
    logOnboardingContact(id, { method, note, followUpDate, nextAction = "", notInterestedReason = "", outcome = "" }) {
      return updateRequest(id, (item) => {
        const name = actingName(state);
        const assigned = item.assignedTo ? null : activityEntry("Assigned", `Assigned to ${name}.`);
        const result = outcome ? { outcome } : {};
        if (notInterestedReason) {
          const contact = activityEntry(method, note, { ...result, followUpDate: "", nextAction: "", statusAfter: "Not Interested" });
          const closed = activityEntry("Closed", notInterestedReason);
          return {
            status: "Not Interested",
            assignedTo: item.assignedTo || name,
            closeReason: notInterestedReason,
            closeNote: note,
            closedBy: name,
            closedAt: new Date().toISOString(),
            followUpDate: "",
            nextAction: "",
            activity: [closed, contact, ...(assigned ? [assigned] : []), ...item.activity],
          };
        }
        const becameContacted = item.status === "New";
        const contact = activityEntry(method, note, {
          ...result,
          followUpDate: followUpDate || "",
          nextAction: nextAction || "",
          ...(becameContacted ? { statusAfter: "Contacted" } : {}),
        });
        const activity = assigned ? [contact, assigned] : [contact];
        return {
          status: becameContacted ? "Contacted" : item.status,
          assignedTo: item.assignedTo || name,
          followUpDate: followUpDate || "",
          nextAction: nextAction || "",
          activity: [...activity, ...item.activity],
        };
      }, notInterestedReason ? "Request Closed" : "Request Contacted", OPEN_REQUEST_STATUSES);
    },
    scheduleOnboardingFollowUp(id, { followUpDate, nextAction = "", note = "" }) {
      return updateRequest(id, (item) => {
        const method = item.followUpDate ? "Follow-up rescheduled" : "Follow-up scheduled";
        const day = (value) => formatDate(`${value}T00:00:00`);
        const summary = item.followUpDate ? `Moved from ${day(item.followUpDate)} to ${day(followUpDate)}.` : `Follow-up set for ${day(followUpDate)}.`;
        return {
          followUpDate,
          nextAction,
          activity: [activityEntry(method, note ? `${summary} ${note}` : summary, { followUpDate, nextAction }), ...item.activity],
        };
      }, "Follow-up Scheduled", OPEN_REQUEST_STATUSES);
    },
    // First claim wins; the backend must make this check-and-assign atomic.
    claimOnboarding(id) {
      const name = state.crmSession?.name;
      const request = onboardingList.find((item) => item.id === id);
      if (!name || !request || request.assignedTo || request.status !== "New") return false;
      const onboarding = onboardingList.map((item) => (
        item.id === id
          ? { ...item, assignedTo: name, claimedAt: new Date().toISOString(), activity: [activityEntry("Claimed", "Claimed from New enquiries."), ...item.activity] }
          : item
      ));
      commit({ ...state, onboarding }, { action: "Request Claimed", tenant: request.hospitalName, resource: id });
      return true;
    },
    addOnboardingNote(id, note) {
      return updateRequest(id, (item) => ({ activity: [activityEntry("Note", note), ...item.activity] }), "Request Note Added");
    },
    updateOnboardingLead(id, patch) {
      return updateRequest(id, (item) => {
        const changes = Object.fromEntries(
          EDITABLE_LEAD_FIELDS
            .filter((key) => Object.prototype.hasOwnProperty.call(patch, key))
            .map((key) => [key, String(patch[key] ?? "").trim()])
            .filter(([key, value]) => value !== (item[key] || "")),
        );
        if (!Object.keys(changes).length) return {};
        const labels = Object.keys(changes).map((key) => EDITABLE_LEAD_LABELS[key]).join(", ");
        return { ...changes, activity: [activityEntry("Details updated", `Updated ${labels}.`), ...item.activity] };
      }, "Request Updated", ["New", "Contacted", "Agreed"]);
    },
    addOnboardingLead(input, { shared = false } = {}) {
      if (!state.crmSession?.userId) throw new Error("Unable to create lead. Please try again.");
      const id = nextNumberedId("ONB", onboardingList);
      const hospitalName = input.hospitalName.trim();
      const source = input.source.trim();
      const owner = actingName(state);
      const created = {
        id,
        hospitalName,
        type: input.type || "General",
        city: input.city.trim(),
        state: input.state.trim(),
        contactPerson: input.contactPerson.trim(),
        designation: input.designation.trim(),
        contactPhone: input.phone.trim(),
        contactEmail: input.email.trim(),
        hospitalEmail: "",
        plan: input.plan.trim(),
        billingCycle: input.billingCycle.trim(),
        source,
        submittedAt: new Date().toISOString(),
        status: "New",
        priority: input.priority || "Medium",
        message: input.message.trim(),
        assignedTo: shared ? "" : owner,
        followUpDate: "",
        nextAction: "",
        activity: [activityEntry("Lead created", shared ? `Source: ${source}. Shared in New enquiries for any CRM employee to claim.` : `Source: ${source}.`)],
        agreedAt: "",
        agreedBy: "",
        handoverNote: "",
        hospitalId: "",
        registeredAt: "",
        registeredBy: "",
        closeReason: "",
        closeNote: "",
        closedBy: "",
        closedAt: "",
      };
      commit(
        { ...state, onboarding: [created, ...onboardingList] },
        { action: "Lead Created", tenant: hospitalName, resource: id },
      );
      return created;
    },
    agreeOnboarding(id, { plan, billingCycle, note = "" }) {
      const name = actingName(state);
      return updateRequest(id, (item) => ({
        status: "Agreed",
        plan,
        billingCycle,
        agreedAt: new Date().toISOString(),
        agreedBy: name,
        handoverNote: note,
        assignedTo: item.assignedTo || name,
        followUpDate: "",
        nextAction: "",
        activity: [
          activityEntry("Agreed", `Hospital agreed to register on ${plan} · ${billingCycle}. Sent to accounts.${note ? ` ${note}` : ""}`),
          ...item.activity,
        ],
      }), "Request Agreed", OPEN_REQUEST_STATUSES);
    },
    closeOnboarding(id, { reason, note }) {
      const name = actingName(state);
      return updateRequest(id, (item) => ({
        status: "Not Interested",
        closeReason: reason,
        closeNote: note || "",
        closedBy: name,
        closedAt: new Date().toISOString(),
        followUpDate: "",
        nextAction: "",
        activity: [activityEntry("Closed", note ? `${reason}. ${note}` : reason), ...item.activity],
      }), "Request Closed", ["New", "Contacted", "Agreed"]);
    },
    reopenOnboarding(id) {
      return updateRequest(id, (item) => ({
        status: item.activity.some((entry) => CONTACT_METHODS.includes(entry.method)) ? "Contacted" : "New",
        closeReason: "",
        closeNote: "",
        closedBy: "",
        closedAt: "",
        activity: [activityEntry("Reopened", "Request reopened for follow-up."), ...item.activity],
      }), "Request Reopened", ["Not Interested"]);
    },
    recordInvoicePayment(id, { method, reference, paidAt, notes = "", amount }) {
      const invoice = state.invoices.find((item) => item.id === id);
      const invoices = state.invoices.map((item) => (
        item.id === id
          ? {
            ...item,
            status: "Paid",
            method,
            reference,
            paidAt,
            notes,
            paymentAmount: Number(amount) || item.amount,
            recordedBy: actingName(state),
          }
          : item
      ));
      commit({ ...state, invoices }, { action: "Payment Recorded", tenant: invoice?.tenant || "Platform", resource: id });
    },
    sendInvoiceReminder(id) {
      const invoice = state.invoices.find((item) => item.id === id);
      const at = new Date().toISOString();
      const entry = { at, by: actingName(state) };
      const invoices = state.invoices.map((item) => (
        item.id === id
          ? { ...item, lastReminderAt: at, reminders: [...(item.reminders || []), entry] }
          : item
      ));
      commit({ ...state, invoices }, { action: "Payment Reminder Sent", tenant: invoice?.tenant || "Platform", resource: id });
    },
    savePlan(plan) {
      const exists = state.plans.some((item) => item.id === plan.id);
      const plans = exists
        ? state.plans.map((item) => (item.id === plan.id ? { ...item, ...plan } : item))
        : [{ ...plan, id: plan.id || `plan-${Date.now()}` }, ...state.plans];
      let hospitals = state.hospitals;
      if (exists) {
        const previous = state.plans.find((item) => item.id === plan.id);
        if (previous && previous.name !== plan.name) {
          hospitals = hospitals.map((hospital) => (hospital.plan === previous.name ? { ...hospital, plan: plan.name } : hospital));
        }
      }
      commit({ ...state, plans, hospitals }, { action: exists ? "Plan Updated" : "Plan Created", resource: plan.name });
    },
    setPlanStatus(id, status) {
      const plans = state.plans.map((plan) => (plan.id === id ? { ...plan, status } : plan));
      const plan = plans.find((item) => item.id === id);
      commit({ ...state, plans }, { action: status === "Active" ? "Plan Enabled" : "Plan Disabled", resource: plan?.name || id });
    },
    saveProfile(profile) {
      commit({ ...state, profile }, { action: "Profile Updated", resource: profile.email });
    },
    markNotificationsRead() {
      setState({ ...state, notifications: state.notifications.map((item) => ({ ...item, read: true })) });
    },
    markNotificationRead(id) {
      setState({ ...state, notifications: state.notifications.map((item) => (item.id === id ? { ...item, read: true } : item)) });
    },
  };

  return <PlatformContext.Provider value={api}>{children}</PlatformContext.Provider>;
}

// Context hooks live beside the provider so pages can share one store.
// eslint-disable-next-line react-refresh/only-export-components
export function usePlatform() {
  const context = useContext(PlatformContext);
  if (!context) throw new Error("usePlatform must be used within PlatformProvider");
  return context;
}

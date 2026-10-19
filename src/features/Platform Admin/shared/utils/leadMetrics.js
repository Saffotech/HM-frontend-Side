/**
 * Per-lead facts shared by the Super Admin CRM performance report and the CRM employee portal,
 * so both show the same numbers for the same lead.
 */
import { CONTACT_METHODS } from "../data/catalog";
import { subscriptionIdFromTenant } from "./invoices";
import { localDay } from "./periods";

export const OPEN_STATUSES = ["New", "Contacted"];
const CONTACT_SET = new Set(CONTACT_METHODS);
const RESCHEDULE_METHOD = "Follow-up rescheduled";
const COMPLETING_METHODS = new Set([...CONTACT_METHODS, "Agreed", "Registration", "Closed"]);

export const time = (value) => {
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
};

export function paidAmount(invoice) {
  return Number(invoice.paymentAmount ?? invoice.amount) || 0;
}

/**
 * Every follow-up that was scheduled on a lead, with the day it was completed (if it was).
 * A follow-up moved to a new date before it fell due is dropped; a missed one that is rescheduled late still counts as missed.
 */
export function followUpsFor(lead) {
  const entries = [...(lead.activity || [])].sort((a, b) => time(a.at) - time(b.at));
  const items = entries.filter((entry) => entry.followUpDate).map((entry) => ({ due: entry.followUpDate, scheduledAt: time(entry.at) }));
  if (lead.followUpDate && !items.some((item) => item.due === lead.followUpDate)) {
    const lastContact = [...entries].reverse().find((entry) => CONTACT_SET.has(entry.method));
    items.push({ due: lead.followUpDate, scheduledAt: time(lastContact?.at || lead.submittedAt) });
  }
  return items.flatMap((item) => {
    const done = entries.find((entry) => COMPLETING_METHODS.has(entry.method) && time(entry.at) > item.scheduledAt);
    const moved = entries.find((entry) => entry.method === RESCHEDULE_METHOD && time(entry.at) > item.scheduledAt && localDay(entry.at) <= item.due);
    if (moved && (!done || time(moved.at) < time(done.at))) return [];
    return [{ ...item, completedDay: done ? localDay(done.at) : "", completedAt: done?.at || "" }];
  });
}

/** Derives everything the performance views need from each lead once, including attributed revenue. */
export function prepareLeads({ onboarding, hospitals, invoices, today }) {
  const hospitalsById = new Map(hospitals.map((hospital) => [hospital.id, hospital]));
  const paidBySubscription = new Map();
  invoices.forEach((invoice) => {
    if (invoice.status !== "Paid") return;
    const id = invoice.subscriptionId || subscriptionIdFromTenant(invoice.tenantId);
    paidBySubscription.set(id, [...(paidBySubscription.get(id) || []), invoice]);
  });

  return onboarding.map((lead) => {
    const activity = lead.activity || [];
    const contacts = activity.filter((entry) => CONTACT_SET.has(entry.method));
    const registered = lead.status === "Registered";
    const open = OPEN_STATUSES.includes(lead.status);
    const followUps = followUpsFor(lead);
    const hospital = registered && lead.hospitalId ? hospitalsById.get(lead.hospitalId) || null : null;
    const subscriptionId = registered && lead.hospitalId ? hospital?.subscriptionId || subscriptionIdFromTenant(lead.hospitalId) : "";
    const paidInvoices = subscriptionId ? paidBySubscription.get(subscriptionId) || [] : [];
    const revenue = paidInvoices.reduce((total, invoice) => total + paidAmount(invoice), 0);
    const lastContact = contacts.reduce((latest, entry) => (time(entry.at) > time(latest?.at) ? entry : latest), null);
    const latest = activity.reduce((last, entry) => (time(entry.at) > time(last?.at) ? entry : last), null);
    return {
      id: lead.id,
      hospitalName: lead.hospitalName,
      owner: lead.assignedTo || "",
      createdBy: activity.find((entry) => entry.method === "Lead created")?.by || "",
      day: localDay(lead.submittedAt),
      status: lead.status,
      plan: lead.plan || "Not specified",
      source: lead.source || "Not specified",
      open,
      contacted: contacts.length > 0,
      contactDays: contacts.map((entry) => localDay(entry.at)),
      agreedDay: localDay(lead.agreedAt),
      registeredDay: registered ? localDay(lead.registeredAt) : "",
      registered,
      hospitalId: registered ? lead.hospitalId : "",
      subscriptionStatus: hospital?.subscriptionStatus || "",
      revenue,
      paidInvoices,
      followUps,
      lastContactAt: lastContact?.at || "",
      nextFollowUp: open ? lead.followUpDate || "" : "",
      overdueNow: open && Boolean(lead.followUpDate) && lead.followUpDate < today,
      activityCount: activity.length,
      lastActivity: latest ? `${latest.method} · ${localDay(latest.at)}` : "",
    };
  });
}

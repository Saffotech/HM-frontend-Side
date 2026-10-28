import { CONTACT_METHODS } from "../../../shared/data/catalog";
import { formatDate } from "../../../shared/utils/formatDate";
import { OPEN_STATUSES, time } from "../../../shared/utils/leadMetrics";
import { daysBetween, localDay, shiftDays } from "../../../shared/utils/periods";

export const PRIORITIES = ["High", "Medium", "Low"];
export const LEAD_SOURCES = ["Phone enquiry", "WhatsApp", "Referral", "Email", "Website", "Campaign", "Other"];
export const CLAIM_LIMIT = 5;
export const CONTACT_OUTCOMES = [
  ["interested", "Interested — follow up again"],
  ["callback", "No answer / asked to call back"],
  ["agreed", "Agreed to register"],
  ["not-interested", "Not interested"],
];

export const OUTCOME_TONE = {
  interested: "crm-tone-interested",
  callback: "crm-tone-callback",
  agreed: "crm-tone-agreed",
  "not-interested": "crm-tone-close",
};

const followRank = { overdue: 0, today: 1, soon: 2, later: 3, none: 4 };
export const priorityRank = { High: 0, Medium: 1, Low: 2 };

export const isOpen = (lead) => OPEN_STATUSES.includes(lead.status);
export const isUnclaimed = (lead) => !lead.assignedTo && lead.status === "New";

export const ORIGINS = {
  added: "Added by me",
  claimed: "Claimed from New",
  assigned: "Assigned to me",
};
export const POOL_ORIGINS = {
  shared: "Shared by me",
  inbound: "From enquiries",
};

/** How a lead reached the employee: added themselves, claimed from New, or assigned to them. */
export function leadOrigin(lead, me) {
  const activity = lead.activity || [];
  const addedByMe = activity.some((entry) => entry.method === "Lead created" && entry.by === me);
  if (isUnclaimed(lead)) return addedByMe ? "shared" : "inbound";
  if (addedByMe) return "added";
  if (lead.claimedAt || activity.some((entry) => entry.method === "Claimed")) return "claimed";
  return "assigned";
}

export function followMeta(date, today) {
  if (!date) return { label: "Not set", tone: "none" };
  if (date < today) return { label: "Overdue", detail: formatDate(`${date}T00:00:00`), tone: "overdue" };
  if (date === today) return { label: "Due today", tone: "today" };
  if (date === shiftDays(today, 1)) return { label: "Tomorrow", tone: "soon" };
  return { label: formatDate(`${date}T00:00:00`), tone: "later" };
}

/** overdue · today · upcoming · unscheduled for open leads; "closed" for everything else. */
export function followBucket(lead, today) {
  if (!isOpen(lead)) return "closed";
  if (!lead.followUpDate) return "unscheduled";
  if (lead.followUpDate < today) return "overdue";
  if (lead.followUpDate === today) return "today";
  return "upcoming";
}

export function leadAge(submittedAt, today) {
  const start = localDay(submittedAt);
  if (!start || !today) return "";
  const days = daysBetween(start, today);
  if (Number.isNaN(days) || days < 0) return "";
  if (days === 0) return "Today";
  if (days === 1) return "1 day old";
  return `${days} days old`;
}

export function compareFollowUps(a, b, today) {
  const byWhen = followRank[followMeta(a.followUpDate, today).tone] - followRank[followMeta(b.followUpDate, today).tone];
  if (byWhen) return byWhen;
  const byDate = String(a.followUpDate || "").localeCompare(String(b.followUpDate || ""));
  if (byDate) return byDate;
  return (priorityRank[a.priority] ?? 1) - (priorityRank[b.priority] ?? 1);
}

export function lastContact(lead) {
  return (lead.activity || [])
    .filter((entry) => CONTACT_METHODS.includes(entry.method))
    .reduce((latest, entry) => (time(entry.at) > time(latest?.at) ? entry : latest), null);
}

/** When the lead entered its current status. */
function stageSince(lead) {
  if (lead.status === "Agreed") return lead.agreedAt;
  if (lead.status === "Registered") return lead.registeredAt;
  if (lead.status === "Not Interested") return lead.closedAt;
  const history = [...(lead.activity || [])].sort((a, b) => time(b.at) - time(a.at));
  if (lead.status === "Contacted") {
    const entered = history.find((entry) => entry.statusAfter === "Contacted" || entry.method === "Reopened");
    return entered?.at || lastContact(lead)?.at || lead.submittedAt;
  }
  return history.find((entry) => entry.method === "Reopened")?.at || lead.submittedAt;
}

export function daysInStage(lead, today) {
  const since = localDay(stageSince(lead));
  return since ? Math.max(0, daysBetween(since, today)) : 0;
}

export function plural(count, word) {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

function digits(value) {
  return String(value || "").replace(/\D/g, "");
}

/** Similar leads across the whole CRM; details of leads owned by someone else are not returned. */
export function findLeadDuplicates(leads, values, me) {
  const name = values.hospitalName.trim().toLowerCase();
  const email = values.email.trim().toLowerCase();
  const phone = digits(values.phone);
  return leads.flatMap((lead) => {
    const reasons = [];
    if (name && lead.hospitalName.trim().toLowerCase() === name) reasons.push("Same hospital name");
    if (email && String(lead.contactEmail || "").trim().toLowerCase() === email) reasons.push("Same email");
    if (phone && digits(lead.contactPhone) === phone) reasons.push("Same phone");
    if (!reasons.length) return [];
    const mine = Boolean(me) && lead.assignedTo === me;
    const unclaimed = isUnclaimed(lead);
    return [{
      id: lead.id,
      mine,
      unclaimed,
      name: mine || unclaimed ? lead.hospitalName : "",
      contact: mine ? lead.contactPerson : "",
      phone: mine ? lead.contactPhone : "",
      status: lead.status,
      owner: mine ? "You" : lead.assignedTo ? "Another team member" : "Unassigned",
      reasons,
    }];
  });
}

import { CONTACT_METHODS } from "../../../shared/data/catalog";
import { paidAmount } from "../../../shared/utils/leadMetrics";
import { inRange, localDay, trailingMonths } from "../../../shared/utils/periods";

export const METRIC_DEFINITIONS = [
  ["Leads received", "Leads assigned to you whose received date falls in the period."],
  ["Leads you created", "Leads you added yourself in the period (phone, referral, walk-in)."],
  ["Contacts logged", "Calls, emails, WhatsApp messages, meetings and visits you logged in the period."],
  ["Agreed", "Leads you handed over to Accounts in the period."],
  ["Registered", "Your leads that Accounts registered as hospitals in the period."],
  ["Conversion rate", "Of the leads received in the period, the share that are registered today. Recent periods rise as leads progress."],
  ["Follow-up completion", "Completed ÷ (completed + missed) for follow-ups that fell due in the period. A follow-up is completed by a contact, handover, close or registration; on time means on or before the due date. Follow-ups due today and not yet done, and ones moved before they fell due, aren't counted."],
  ["Overdue now", "Open leads whose follow-up date has passed, as of today."],
  ["Attributed revenue", "Paid subscription invoices, by invoice date, for hospitals registered from your leads."],
  ["Monthly target", "Shows “Not set” until a sales target is configured for you. No target is assumed."],
  ["Open leads", "Your leads that are New or Contacted, as of today. Agreed leads (with Accounts), registered and closed leads aren't counted."],
];

function cohort(prepared, range, me) {
  const received = prepared.filter((lead) => inRange(lead.day, range));
  return {
    received,
    created: received.filter((lead) => lead.createdBy === me),
    agreed: prepared.filter((lead) => inRange(lead.agreedDay, range)),
    registered: prepared.filter((lead) => inRange(lead.registeredDay, range)),
    cohortRegistered: received.filter((lead) => lead.registered),
    cohortContacted: received.filter((lead) => lead.contacted || lead.agreedDay || lead.registered),
    cohortAgreed: received.filter((lead) => lead.agreedDay || lead.registered),
  };
}

function followUpStats(prepared, range, today) {
  const end = range.end < today ? range.end : today;
  const due = prepared.flatMap((lead) => lead.followUps.filter((item) => item.due >= range.start && item.due <= end));
  const completed = due.filter((item) => item.completedDay);
  const onTime = completed.filter((item) => item.completedDay <= item.due);
  const missed = due.filter((item) => !item.completedDay && item.due < today);
  return { due: due.length, completed: completed.length, onTime: onTime.length, late: completed.length - onTime.length, missed: missed.length };
}

function revenueIn(prepared, range) {
  return prepared.reduce((total, lead) => total + lead.paidInvoices
    .filter((invoice) => inRange(localDay(invoice.invoiceDate), range))
    .reduce((sum, invoice) => sum + paidAmount(invoice), 0), 0);
}

function contactsIn(leads, range, me) {
  return leads.reduce((total, lead) => total + (lead.activity || []).filter((entry) => (
    CONTACT_METHODS.includes(entry.method) && entry.by === me && inRange(localDay(entry.at), range)
  )).length, 0);
}

export function buildMyPerformance({ leads, prepared, period, today, me }) {
  const current = cohort(prepared, period, me);
  const previous = cohort(prepared, period.previous, me);
  const months = trailingMonths(period.end, 6);
  const paidCount = prepared.reduce((total, lead) => total + lead.paidInvoices.length, 0);

  return {
    current,
    previous,
    contacts: contactsIn(leads, period, me),
    previousContacts: contactsIn(leads, period.previous, me),
    followUps: followUpStats(prepared, period, today),
    overdueNow: prepared.filter((lead) => lead.overdueNow).length,
    openLeads: prepared.filter((lead) => lead.open),
    revenue: revenueIn(prepared, period),
    previousRevenue: revenueIn(prepared, period.previous),
    hasRevenueData: paidCount > 0,
    monthly: months.map((month) => {
      const range = { start: month.start, end: month.end };
      const stats = followUpStats(prepared, range, today);
      return {
        label: month.label,
        Received: prepared.filter((lead) => inRange(lead.day, range)).length,
        Agreed: prepared.filter((lead) => inRange(lead.agreedDay, range)).length,
        Registered: prepared.filter((lead) => inRange(lead.registeredDay, range)).length,
        "On time": stats.onTime,
        Late: stats.late,
        Missed: stats.missed,
        Revenue: revenueIn(prepared, range),
      };
    }),
  };
}

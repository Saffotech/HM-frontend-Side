/**
 * CRM employee performance metrics, calculated from the onboarding leads, hospitals and invoices in PlatformContext.
 * Everything here is a pure function so the same shapes can later come from the backend:
 *   GET /platform/crm/analytics                       -> buildCrmPerformance(...) result
 *   GET /platform/crm/analytics/employees/:employeeId -> one entry of `employees` plus `leadsByEmployee[name]`
 *   GET /platform/crm/analytics/revenue               -> `employees[].revenue`
 *
 * PERIOD RULE (cohort): lead metrics count the leads RECEIVED in the selected period (lead.submittedAt)
 * and follow what has happened to them since. This keeps leads, contacted, conversions and revenue on the
 * same base, so a conversion rate can never exceed 100%. The trend chart uses the same rule per month.
 * Follow-up discipline is the exception: it counts follow-ups whose DUE DATE falls in the period.
 *
 * METRIC DEFINITIONS
 *   Leads assigned       Leads received in the period whose owner (lead.assignedTo) is the employee.
 *   Self-sourced leads   Of those, leads the employee created in the CRM ("Lead created" activity by them).
 *   Leads contacted      Leads with at least one logged contact activity (Phone call, Email, WhatsApp, Video meeting, Site visit).
 *   Conversions          Leads whose status is Registered (converted into a hospital).
 *   Conversion rate      Conversions / leads received in the period x 100.
 *   Revenue generated    Paid invoices on the subscription of the hospital each converted lead became.
 *   Avg revenue / conv.  Revenue generated / conversions (trial or unpaid conversions count as zero revenue).
 *   Follow-ups due       Follow-up dates (from contact activity or the lead's next follow-up) falling in the
 *                        period, up to today. A follow-up due today that is not done yet is not counted.
 *   Follow-ups completed A due follow-up after which a contact, registration or closure was logged on the lead.
 *   Overdue follow-ups   Open leads (New or Contacted) whose next follow-up date has passed. Always "as of today".
 *   Active employees     Employees who logged any lead activity in the period.
 *
 * REVENUE ATTRIBUTION
 *   CRM employee (lead.assignedTo) -> lead -> lead.hospitalId -> hospital.subscriptionId -> invoices (status Paid).
 *   The owner of the lead is credited, not lead.registeredBy, because the owner is responsible for the lead.
 *
 * KNOWN DATA GAPS (to close when the backend is connected)
 *   1. Leads store the employee by display name (assignedTo, activity.by). There is no employee ID, so a rename
 *      breaks attribution. Backend should send assignedToId / activity.byId.
 *   2. There is no CRM employee directory. The roster is the CRM portal users plus every name leads are assigned to.
 *   3. There is no assignment timestamp, so the lead date is used as the assignment date.
 *   4. The lead -> subscription link is indirect (via hospitalId). Registering a hospital does not raise an invoice,
 *      so a new conversion shows no revenue until an invoice is raised and paid.
 *   5. Hospitals registered without a lead (older tenants) have no CRM owner and are not attributed to anyone.
 *   6. "Lead created by" only exists for leads added in the CRM panel; website/phone leads have no creator.
 */
import { paidAmount, prepareLeads } from "../../../../../shared/utils/leadMetrics";
import { inRange, localDay, trailingMonths } from "../../../../../shared/utils/periods";

/**
 * PERFORMANCE SCORE (0-100)
 * Each part is scaled 0..1 and multiplied by its weight; the weights add up to 100.
 *   conversionRate      Smoothed conversion rate relative to the best on the team (see CONVERSION_SMOOTHING).
 *   revenue             Revenue relative to the highest earner.
 *   conversions         Conversion count relative to the most conversions.
 *   contactRate         Share of the employee's leads that were contacted.
 *   followUpCompletion  Share of due follow-ups completed (full marks when nothing was due).
 *   leadVolume          Leads relative to the busiest employee. Kept small so volume alone cannot win.
 * Then OVERDUE_PENALTY points are taken off per overdue follow-up, up to the cap.
 */
export const SCORE_WEIGHTS = {
  conversionRate: 25,
  revenue: 20,
  conversions: 15,
  contactRate: 15,
  followUpCompletion: 15,
  leadVolume: 10,
};
const OVERDUE_PENALTY = { perFollowUp: 3, max: 15 };
/**
 * Adds this many "average" leads to everyone's conversion rate before comparing, so 1 conversion out of
 * 1 lead does not beat 5 out of 12: (conversions + teamRate x K) / (leads + K).
 */
const CONVERSION_SMOOTHING = 3;
const RATING_BANDS = [
  [75, "Excellent"],
  [55, "Good"],
  [35, "Average"],
  [0, "Needs Attention"],
];
const ATTENTION_RULES = {
  overdueFollowUps: 2,
  minLeadsForRate: 3,
  lowConversionVsTeam: 0.5,
  minFollowUpsDue: 2,
  completionBelow: 0.7,
  idleDays: 7,
  scoreDrop: 15,
};

const sum = (list, pick) => list.reduce((total, item) => total + (Number(pick(item)) || 0), 0);
const relative = (value, best) => (best > 0 ? value / best : 0);
export const ratio = (part, total) => (total ? part / total : 0);
export const formatRate = (value) => `${(value * 100).toFixed(1)}%`;

function ratingFor(score) {
  return RATING_BANDS.find(([min]) => score >= min)[1];
}

function summarize(leads) {
  const conversions = leads.filter((lead) => lead.registered);
  const revenue = sum(conversions, (lead) => lead.revenue);
  return {
    leads: leads.length,
    contacted: leads.filter((lead) => lead.contacted).length,
    conversions: conversions.length,
    conversionRate: ratio(conversions.length, leads.length),
    revenue,
    avgRevenue: conversions.length ? revenue / conversions.length : 0,
  };
}

function followUpStats(leads, range, today) {
  const items = leads.flatMap((lead) => lead.followUps.filter((item) => (
    inRange(item.due, range) && (item.due < today || item.completedDay)
  )));
  const completed = items.filter((item) => item.completedDay).length;
  return {
    due: items.length,
    completed,
    overdue: items.filter((item) => !item.completedDay).length,
    completionRate: items.length ? completed / items.length : null,
  };
}

function matchesFilters(lead, filters) {
  return (filters.employee === "all" || lead.owner === filters.employee)
    && (filters.status === "all" || lead.status === filters.status)
    && (filters.plan === "all" || lead.plan === filters.plan)
    && (filters.source === "all" || lead.source === filters.source);
}

const CARD_STATUSES = ["New", "Contacted", "Agreed", "Registered", "Not Interested"];

/** Date, employee, plan, and source only. The status filter highlights a card and does not drop the others. */
function matchesCardScope(lead, filters) {
  return (filters.employee === "all" || lead.owner === filters.employee)
    && (filters.plan === "all" || lead.plan === filters.plan)
    && (filters.source === "all" || lead.source === filters.source);
}

function uniquePaidRevenue(leads) {
  const seen = new Set();
  return leads.reduce((total, lead) => (lead.paidInvoices || []).reduce((sum, invoice) => {
    if (!invoice || invoice.status !== "Paid" || seen.has(invoice)) return sum;
    seen.add(invoice);
    return sum + paidAmount(invoice);
  }, total), 0);
}

/** Current lead status for the summary cards. Contacted here is the status, not a logged call. */
function performanceCards(leads) {
  const counts = Object.fromEntries(CARD_STATUSES.map((status) => [status, 0]));
  const counted = [];
  leads.forEach((lead) => {
    if (!Object.prototype.hasOwnProperty.call(counts, lead.status)) return;
    counts[lead.status] += 1;
    counted.push(lead);
  });
  const total = CARD_STATUSES.reduce((sum, status) => sum + counts[status], 0);
  const registered = counts.Registered;
  const revenue = uniquePaidRevenue(counted.filter((lead) => lead.status === "Registered"));
  return {
    leads: total,
    contacted: counts.Contacted,
    agreed: counts.Agreed,
    registered,
    notInterested: counts["Not Interested"],
    conversionRate: ratio(registered, total),
    revenue,
    avgRevenue: registered ? revenue / registered : 0,
    overdue: counted.filter((lead) => lead.overdueNow).length,
    total,
  };
}

function employeeRow(name, scoped, range, today, activityLog, roleFor) {
  const mine = scoped.filter((lead) => lead.owner === name);
  const cohort = mine.filter((lead) => inRange(lead.day, range));
  const own = activityLog.filter((entry) => entry.by === name);
  const lastActive = own.reduce((last, entry) => (entry.day > last ? entry.day : last), "");
  return {
    name,
    role: roleFor(name),
    ...summarize(cohort),
    selfSourced: cohort.filter((lead) => lead.createdBy === name).length,
    follow: followUpStats(mine, range, today),
    overdueNow: mine.filter((lead) => lead.overdueNow).length,
    openLeads: mine.filter((lead) => lead.open).length,
    activeInPeriod: own.some((entry) => inRange(entry.day, range)),
    lastActive,
  };
}

/** Applies SCORE_WEIGHTS and ranks employees. Employees without leads in the period are listed but not ranked. */
function scoreEmployees(rows) {
  const ranked = rows.filter((row) => row.leads > 0);
  const teamRate = ratio(sum(ranked, (row) => row.conversions), sum(ranked, (row) => row.leads));
  const smoothed = (row) => (row.conversions + teamRate * CONVERSION_SMOOTHING) / (row.leads + CONVERSION_SMOOTHING);
  const best = (pick) => Math.max(0, ...ranked.map(pick));
  const top = {
    conversionRate: best(smoothed),
    revenue: best((row) => row.revenue),
    conversions: best((row) => row.conversions),
    leads: best((row) => row.leads),
  };

  const scored = rows.map((row) => {
    if (!row.leads) return { ...row, score: null, rating: "No leads", parts: null, penalty: 0, adjustedRate: 0 };
    const parts = {
      conversionRate: relative(smoothed(row), top.conversionRate),
      revenue: relative(row.revenue, top.revenue),
      conversions: relative(row.conversions, top.conversions),
      contactRate: ratio(row.contacted, row.leads),
      followUpCompletion: row.follow.completionRate ?? 1,
      leadVolume: relative(row.leads, top.leads),
    };
    const earned = Object.entries(SCORE_WEIGHTS).reduce((total, [key, weight]) => total + weight * parts[key], 0);
    const penalty = Math.min(OVERDUE_PENALTY.max, row.overdueNow * OVERDUE_PENALTY.perFollowUp);
    const score = Math.max(0, Math.round(earned - penalty));
    return { ...row, score, rating: ratingFor(score), parts, penalty, adjustedRate: smoothed(row) };
  });

  scored.sort((a, b) => (
    (b.score ?? -1) - (a.score ?? -1)
    || b.revenue - a.revenue
    || b.conversions - a.conversions
    || a.name.localeCompare(b.name)
  ));
  let rank = 0;
  return { teamRate, rows: scored.map((row) => ({ ...row, rank: row.score === null ? null : (rank += 1) })) };
}

function attentionReasons(row, previous, teamRate, today) {
  const rules = ATTENTION_RULES;
  const reasons = [];
  if (row.overdueNow >= rules.overdueFollowUps) reasons.push(`${row.overdueNow} overdue follow-ups`);
  if (row.leads >= rules.minLeadsForRate && teamRate > 0 && row.conversionRate < teamRate * rules.lowConversionVsTeam) {
    reasons.push(`Conversion rate ${formatRate(row.conversionRate)} against a team rate of ${formatRate(teamRate)}`);
  }
  if (row.follow.due >= rules.minFollowUpsDue && row.follow.completionRate < rules.completionBelow) {
    reasons.push(`Completed ${row.follow.completed} of ${row.follow.due} follow-ups due`);
  }
  if (row.openLeads > 0) {
    const idle = row.lastActive ? Math.round((new Date(`${today}T00:00:00`) - new Date(`${row.lastActive}T00:00:00`)) / 86400000) : null;
    if (idle === null) reasons.push(`${row.openLeads} open lead${row.openLeads === 1 ? "" : "s"} with no activity logged yet`);
    else if (idle >= rules.idleDays) reasons.push(`No lead activity logged in ${idle} days`);
  }
  if (previous?.score != null && row.score != null && previous.score - row.score >= rules.scoreDrop) {
    reasons.push(`Score down from ${previous.score} to ${row.score} vs previous period`);
  }
  if (!reasons.length && row.rating === "Needs Attention") reasons.push("Overall score is in the lowest band for this period");
  return reasons;
}

export function buildCrmPerformance({ onboarding, hospitals, invoices, crmUsers, filters, period, today }) {
  const prepared = prepareLeads({ onboarding, hospitals, invoices, today });
  const scoped = prepared.filter((lead) => matchesFilters(lead, filters));
  const roleFor = (name) => crmUsers.find((user) => user.name === name)?.role || "CRM";
  const allNames = [...new Set([...crmUsers.filter((user) => user.portal === "crm").map((user) => user.name), ...prepared.map((lead) => lead.owner).filter(Boolean)])].sort();
  const names = filters.employee === "all" ? allNames : allNames.filter((name) => name === filters.employee);
  const activityLog = onboarding.flatMap((lead) => (lead.activity || []).map((entry) => ({ by: entry.by, day: localDay(entry.at) })));

  const rowsFor = (range) => scoreEmployees(names.map((name) => employeeRow(name, scoped, range, today, activityLog, roleFor)));
  const current = rowsFor(period);
  const previous = rowsFor(period.previous);
  const previousByName = new Map(previous.rows.map((row) => [row.name, row]));
  const employees = current.rows.map((row) => ({
    ...row,
    previous: previousByName.get(row.name) || null,
    attention: attentionReasons(row, previousByName.get(row.name), current.teamRate, today),
  }));

  const cohort = scoped.filter((lead) => inRange(lead.day, period));
  const previousCohort = scoped.filter((lead) => inRange(lead.day, period.previous));
  const cardLeads = prepared.filter((lead) => matchesCardScope(lead, filters) && inRange(lead.day, period));
  const activeIn = (range) => names.filter((name) => activityLog.some((entry) => entry.by === name && inRange(entry.day, range))).length;
  const ranked = employees.filter((row) => row.rank);
  const pickBest = (pick) => ranked.reduce((best, row) => (!best || pick(row) > pick(best) ? row : best), null);
  const team = summarize(cohort);

  const months = trailingMonths(period.end, 6);
  const trend = Object.fromEntries(["leads", "conversions", "revenue"].map((metric) => [
    metric,
    months.map((month) => ({
      label: month.label,
      ...Object.fromEntries(names.map((name) => [
        name,
        summarize(scoped.filter((lead) => lead.owner === name && inRange(lead.day, month)))[metric],
      ])),
    })),
  ]));

  return {
    period,
    summary: performanceCards(cardLeads),
    team: {
      current: { ...team, activeEmployees: activeIn(period) },
      previous: { ...summarize(previousCohort), activeEmployees: activeIn(period.previous) },
      overdueNow: scoped.filter((lead) => lead.owner && lead.overdueNow).length,
      conversionRate: current.teamRate,
    },
    employees,
    highlights: {
      // A top performer must have converted at least once; otherwise the dashboard shows who leads on score.
      top: ranked.find((row) => row.conversions > 0) || null,
      leader: ranked[0] || null,
      mostLeads: pickBest((row) => row.leads),
      bestRate: pickBest((row) => row.adjustedRate),
      topRevenue: pickBest((row) => row.revenue)?.revenue ? pickBest((row) => row.revenue) : null,
    },
    attention: employees.filter((row) => row.attention.length),
    trend,
    leadsByEmployee: Object.fromEntries(names.map((name) => [
      name,
      scoped.filter((lead) => lead.owner === name).sort((a, b) => b.day.localeCompare(a.day)),
    ])),
  };
}

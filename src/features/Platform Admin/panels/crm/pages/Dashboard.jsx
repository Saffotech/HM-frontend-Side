import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import {
  AlarmClock,
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  CalendarCheck,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  Percent,
  Plus,
  Users,
  X,
} from "lucide-react";
import Button from "../../../shared/components/Button";
import { formatCurrency } from "../../../shared/utils/formatCurrency";
import { formatDate } from "../../../shared/utils/formatDate";
import { prepareLeads } from "../../../shared/utils/leadMetrics";
import { FollowMark, PriorityMark, StatusMark } from "../components/CrmMarks";
import { compareFollowUps, followBucket, followMeta, isOpen, plural } from "../utils/crmLeads";
import { useCrm } from "../workspace/workspace-context";
import "./Dashboard.css";

const percent = (part, total) => (total ? `${((part / total) * 100).toFixed(1)}%` : "—");
const VIEWS = ["due", "open", "today", "overdue", "registered", "conversion", "revenue"];

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function subscriptionTone(status) {
  if (status === "Active") return "converted";
  if (status === "Trial") return "new";
  return "closed";
}

export default function Dashboard() {
  const { me, today, leads, hospitals, invoices, actions, billingAvailable } = useCrm();
  const [params, setParams] = useSearchParams();
  const view = VIEWS.includes(params.get("card")) ? params.get("card") : "due";
  const prepared = useMemo(() => prepareLeads({ onboarding: leads, hospitals, invoices, today }), [leads, hospitals, invoices, today]);
  const facts = useMemo(() => new Map(prepared.map((row) => [row.id, row])), [prepared]);

  const buckets = useMemo(() => {
    const by = { overdue: [], today: [], upcoming: [], unscheduled: [] };
    leads.forEach((lead) => by[followBucket(lead, today)]?.push(lead));
    return by;
  }, [leads, today]);
  const byFollowUp = (a, b) => compareFollowUps(a, b, today);
  const open = leads.filter(isOpen);
  const fresh = open.filter((lead) => lead.status === "New").length;
  const withAccounts = leads.filter((lead) => lead.status === "Agreed");
  const registered = leads.filter((lead) => lead.status === "Registered");
  const registeredThisMonth = registered.filter((lead) => facts.get(lead.id)?.registeredDay.slice(0, 7) === today.slice(0, 7)).length;
  const earning = registered.filter((lead) => facts.get(lead.id)?.paidInvoices.length);
  const revenue = earning.reduce((total, lead) => total + facts.get(lead.id).revenue, 0);
  const paidInvoices = earning.reduce((total, lead) => total + facts.get(lead.id).paidInvoices.length, 0);

  const select = (next) => {
    setParams((current) => {
      const updated = new URLSearchParams(current);
      if (next === "due" || next === view) updated.delete("card");
      else updated.set("card", next);
      return updated;
    }, { replace: true });
  };

  const rowsByView = {
    due: [...buckets.overdue, ...buckets.today].sort(byFollowUp),
    open: [...open].sort(byFollowUp),
    today: [...buckets.today].sort(byFollowUp),
    overdue: [...buckets.overdue].sort(byFollowUp),
    registered: [...registered].sort((a, b) => String(b.registeredAt).localeCompare(String(a.registeredAt))),
    conversion: [...leads].sort((a, b) => String(b.submittedAt).localeCompare(String(a.submittedAt))),
    revenue: [...earning].sort((a, b) => facts.get(b.id).revenue - facts.get(a.id).revenue),
  };
  const rows = rowsByView[view];

  const hospitalCell = (lead) => (
    <td>
      <button type="button" className="crm-row-link" onClick={() => actions.openLead(lead.id)}>{lead.hospitalName}</button>
      <span className="crm-sub">{lead.city || "—"}</span>
    </td>
  );
  const contactCell = (lead) => <td>{lead.contactPerson || "—"}{lead.designation && <span className="crm-sub">{lead.designation}</span>}</td>;
  const phoneCell = (lead) => <td className="crm-nowrap">{lead.contactPhone || "—"}</td>;
  const planCell = (lead) => <td>{lead.plan || "—"}{lead.billingCycle && <span className="crm-sub">{lead.billingCycle}</span>}</td>;
  const followUpTable = {
    columns: ["Hospital", "Contact", "Phone", "Priority", "Due", "Next action"],
    cells: (lead) => (
      <>
        {hospitalCell(lead)}
        {contactCell(lead)}
        {phoneCell(lead)}
        <td><PriorityMark value={lead.priority} /></td>
        <td><FollowMark meta={followMeta(lead.followUpDate, today)} /></td>
        <td><span className="crm-clip" title={lead.nextAction}>{lead.nextAction || "—"}</span></td>
      </>
    ),
  };

  const config = {
    due: {
      title: "Today's follow-ups",
      note: "Overdue and due today",
      empty: ["No follow-ups due today", buckets.upcoming.length ? `${plural(buckets.upcoming.length, "follow-up")} coming up.` : "Schedule follow-ups from any open lead."],
      ...followUpTable,
    },
    today: {
      title: "Due today",
      note: "Follow-ups scheduled for today",
      empty: ["Nothing due today", buckets.upcoming.length ? `${plural(buckets.upcoming.length, "follow-up")} coming up.` : "Nothing scheduled ahead either."],
      ...followUpTable,
    },
    overdue: {
      title: "Overdue follow-ups",
      note: "Oldest first",
      empty: ["No overdue follow-ups", "You're on schedule."],
      ...followUpTable,
    },
    open: {
      title: "Open leads",
      note: `${fresh} new · ${open.length - fresh} contacted`,
      empty: ["No open leads", "Add a lead to get started."],
      columns: ["Hospital", "Contact", "Phone", "Priority", "Status", "Next follow-up"],
      cells: (lead) => (
        <>
          {hospitalCell(lead)}
          {contactCell(lead)}
          {phoneCell(lead)}
          <td><PriorityMark value={lead.priority} /></td>
          <td><StatusMark status={lead.status} /></td>
          <td><FollowMark meta={followMeta(lead.followUpDate, today)} /></td>
        </>
      ),
    },
    registered: {
      title: "Hospitals registered",
      note: `${registeredThisMonth} this month · ${withAccounts.length} still with Accounts`,
      empty: ["No registered hospitals yet", "Hospitals appear here once Accounts registers them."],
      columns: ["Hospital", "Plan", "Registered", "Registered by", "Subscription"],
      cells: (lead) => {
        const status = facts.get(lead.id)?.subscriptionStatus;
        return (
          <>
            {hospitalCell(lead)}
            {planCell(lead)}
            <td className="crm-nowrap">{formatDate(lead.registeredAt)}</td>
            <td>{lead.registeredBy || "—"}</td>
            <td>{status ? <span className={`crm-badge crm-badge-${subscriptionTone(status)}`}>{status}</span> : <span className="crm-sub">—</span>}</td>
          </>
        );
      },
    },
    conversion: {
      title: "All assigned leads",
      note: `${registered.length} of ${plural(leads.length, "lead")} registered`,
      empty: ["No leads assigned to you yet", "Leads you add or receive appear here."],
      columns: ["Hospital", "Contact", "Plan", "Status", "Received"],
      cells: (lead) => (
        <>
          {hospitalCell(lead)}
          {contactCell(lead)}
          {planCell(lead)}
          <td><StatusMark status={lead.status} /></td>
          <td className="crm-nowrap">{formatDate(lead.submittedAt)}</td>
        </>
      ),
    },
    revenue: {
      title: "Attributed revenue",
      note: billingAvailable
        ? (paidInvoices ? `${plural(paidInvoices, "paid invoice")} · ${formatCurrency(revenue)}` : "Paid subscription invoices of your hospitals")
        : "Platform invoices are not available from the server",
      empty: billingAvailable
        ? ["No paid invoices yet", "Revenue shows once hospitals registered from your leads pay."]
        : ["Revenue unavailable", "There is no platform invoice API yet, so this is not estimated from demo data."],
      columns: ["Hospital", "Plan", "Registered", "Paid invoices", "Paid revenue"],
      cells: (lead) => {
        const fact = facts.get(lead.id);
        return (
          <>
            {hospitalCell(lead)}
            {planCell(lead)}
            <td className="crm-nowrap">{formatDate(lead.registeredAt)}</td>
            <td>{fact.paidInvoices.length}</td>
            <td className="crm-nowrap"><strong>{formatCurrency(fact.revenue)}</strong></td>
          </>
        );
      },
    },
  }[view];

  return (
    <div className="crm-page crm-dash">
      <section className="crm-hello" aria-label="Today">
        <div className="crm-hello-text">
          <h2>{greeting()}, {me.split(" ")[0]}</h2>
          <div className="crm-hello-status">
            <p><CalendarDays size={15} aria-hidden="true" />{new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>
            {buckets.overdue.length > 0 && (
              <button type="button" className="crm-hello-pill is-alert" onClick={() => select("overdue")}>
                <AlertTriangle size={15} aria-hidden="true" />
                {plural(buckets.overdue.length, "follow-up")} overdue
                <ArrowRight size={14} aria-hidden="true" />
              </button>
            )}
            {buckets.today.length > 0 && (
              <button type="button" className="crm-hello-pill is-warn" onClick={() => select("today")}>
                <CalendarCheck size={15} aria-hidden="true" />
                {plural(buckets.today.length, "follow-up")} due today
                <ArrowRight size={14} aria-hidden="true" />
              </button>
            )}
            {buckets.overdue.length === 0 && buckets.today.length === 0 && (
              <span className="crm-hello-pill is-good">
                <CheckCircle2 size={15} aria-hidden="true" />
                No follow-ups overdue or due today
              </span>
            )}
          </div>
        </div>
        <div className="crm-page-actions">
          <Button onClick={actions.addLead}><Plus size={16} aria-hidden="true" />Add lead</Button>
        </div>
      </section>

      <section className="crm-kpis" aria-label="Key numbers">
        <Kpi active={view === "open"} onClick={() => select("open")} icon={Users} label="Open leads" value={open.length} hint={`${fresh} new · ${open.length - fresh} contacted`} />
        <Kpi active={view === "today"} onClick={() => select("today")} icon={CalendarCheck} label="Due today" value={buckets.today.length} hint={buckets.upcoming.length ? `${buckets.upcoming.length} upcoming` : "Nothing scheduled ahead"} tone={buckets.today.length ? "warn" : ""} />
        <Kpi active={view === "overdue"} onClick={() => select("overdue")} icon={AlarmClock} label="Overdue" value={buckets.overdue.length} hint={buckets.overdue.length ? "Oldest first" : "You're on schedule"} tone={buckets.overdue.length ? "alert" : ""} />
        <Kpi active={view === "registered"} onClick={() => select("registered")} icon={BadgeCheck} label="Hospitals registered" value={registered.length} hint={`${registeredThisMonth} this month · ${withAccounts.length} with Accounts`} tone="good" />
        <Kpi
          active={view === "conversion"}
          onClick={() => select("conversion")}
          icon={Percent}
          label="Conversion rate"
          value={percent(registered.length, leads.length)}
          hint={`${registered.length} of ${plural(leads.length, "assigned lead")}`}
          title="Registered hospitals ÷ all leads assigned to you (all time)"
        />
        <Kpi
          active={view === "revenue"}
          onClick={() => select("revenue")}
          icon={CircleDollarSign}
          label="Attributed revenue"
          value={billingAvailable ? (paidInvoices ? formatCurrency(revenue) : "No paid invoices yet") : "Unavailable"}
          hint={billingAvailable
            ? (paidInvoices ? `${plural(paidInvoices, "paid invoice")} from your hospitals` : "Shown once your hospitals pay")
            : "Platform invoices are not available from the server"}
          tone={paidInvoices ? "" : "muted"}
          title="Paid subscription invoices of hospitals registered from your leads"
        />
      </section>

      <section className="crm-card crm-dash-due" aria-live="polite">
        <header className="crm-card-head">
          <div>
            <h2>{config.title} <span className="crm-dash-count">{rows.length}</span></h2>
            <p>{config.note}</p>
          </div>
          {view !== "due" && (
            <button type="button" className="crm-link" onClick={() => select("due")}><X size={13} aria-hidden="true" />Back to today&apos;s follow-ups</button>
          )}
        </header>
        <div className="crm-table-wrap">
          <table className="crm-table">
            <thead>
              <tr>
                {config.columns.map((column) => <th key={column} scope="col">{column}</th>)}
                <th scope="col" className="is-end">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr className="crm-table-empty">
                  <td colSpan={config.columns.length + 1}>
                    <div className="crm-empty">
                      <CheckCircle2 size={26} aria-hidden="true" />
                      <strong>{config.empty[0]}</strong>
                      <span>{config.empty[1]}</span>
                    </div>
                  </td>
                </tr>
              ) : rows.map((lead) => (
                <tr key={lead.id}>
                  {config.cells(lead)}
                  <td>
                    <div className="crm-row-actions">
                      <button type="button" className="crm-link" onClick={() => actions.openLead(lead.id)}>Open</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Kpi({ active, onClick, icon: Icon, label, value, hint, tone = "", title }) {
  return (
    <button
      type="button"
      className={`crm-kpi${tone ? ` is-${tone}` : ""}${active ? " is-active" : ""}`}
      aria-pressed={active}
      title={title}
      onClick={onClick}
    >
      <span className="crm-kpi-label"><Icon size={15} aria-hidden="true" />{label}</span>
      <strong>{value}</strong>
      <small>{hint}</small>
    </button>
  );
}

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
import Pagination from "../../../shared/components/Pagination";
import { LIST_PAGE_SIZE, usePagination } from "../../../shared/hooks/usePagination";
import { useCrmRevenue } from "../../../shared/hooks/useCrmRevenue";
import { formatCurrency } from "../../../shared/utils/formatCurrency";
import { formatPhoneDisplay } from "../../../shared/utils/phoneNumbers";
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
  const { me, today, leads, hospitals, invoices, actions } = useCrm();
  const { revenue: attributed, loading: revenueLoading, error: revenueError } = useCrmRevenue();
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
  };
  const rows = rowsByView[view] || [];
  const revenueHospitals = attributed?.hospitals || [];
  const pagination = usePagination(view === "revenue" ? revenueHospitals : rows, LIST_PAGE_SIZE, view);

  const openRow = (event, leadId) => {
    if (event.target.closest("button, a, input, select, textarea")) return;
    actions.openLead(leadId);
  };

  const openRowFromKeyboard = (event, leadId) => {
    if (event.target !== event.currentTarget || (event.key !== "Enter" && event.key !== " ")) return;
    event.preventDefault();
    actions.openLead(leadId);
  };

  const hospitalCell = (lead) => (
    <td>
      <button type="button" className="crm-row-link" onClick={() => actions.openLead(lead.id)}>{lead.hospitalName}</button>
      <span className="crm-sub">{lead.city || "—"}</span>
    </td>
  );
  const contactCell = (lead) => <td>{lead.contactPerson || "—"}{lead.designation && <span className="crm-sub">{lead.designation}</span>}</td>;
  const phoneCell = (lead) => <td className="crm-nowrap">{formatPhoneDisplay(lead.contactPhone) || "—"}</td>;
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
      note: attributed
        ? `${plural(attributed.collectedCount, "paid invoice")} · ${formatCurrency(attributed.collectedAmount)}`
        : (revenueLoading ? "Loading paid invoices" : "Paid subscription invoices of hospitals from your leads"),
      empty: revenueError
        ? [revenueError, "Paid invoices for your hospitals could not be loaded."]
        : ["No registered hospitals yet", "Paid invoices appear here for hospitals registered from your leads. Pending invoices are not included."],
      columns: ["Hospital", "Plan", "Paid invoices", "Paid revenue"],
      cells: null,
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
        <Kpi active={view === "open"} onClick={() => select("open")} icon={Users} label="Open leads" value={open.length} />
        <Kpi active={view === "today"} onClick={() => select("today")} icon={CalendarCheck} label="Due today" value={buckets.today.length} tone={buckets.today.length ? "warn" : ""} />
        <Kpi active={view === "overdue"} onClick={() => select("overdue")} icon={AlarmClock} label="Overdue" value={buckets.overdue.length} tone={buckets.overdue.length ? "alert" : ""} />
        <Kpi active={view === "registered"} onClick={() => select("registered")} icon={BadgeCheck} label="Hospitals registered" value={registered.length} tone="good" />
        <Kpi
          active={view === "conversion"}
          onClick={() => select("conversion")}
          icon={Percent}
          label="Conversion rate"
          value={percent(registered.length, leads.length)}
          title="Registered hospitals ÷ all leads assigned to you (all time)"
        />
        <Kpi
          active={view === "revenue"}
          onClick={() => select("revenue")}
          icon={CircleDollarSign}
          label="Attributed revenue"
          value={revenueLoading && !attributed ? "…" : attributed ? formatCurrency(attributed.collectedAmount) : "—"}
          tone={attributed?.collectedCount ? "" : "muted"}
          title="Paid subscription invoices of hospitals registered from your leads"
        />
      </section>

      <section className="crm-card crm-dash-due" aria-live="polite">
        <header className="crm-card-head">
          <div>
            <h2>{config.title} <span className="crm-dash-count">{view === "revenue" ? (attributed?.hospitals.length ?? 0) : rows.length}</span></h2>
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
              </tr>
            </thead>
            <tbody>
              {view === "revenue" ? (
                <RevenueRows
                  hospitals={pagination.rows}
                  loading={revenueLoading && !attributed}
                  error={revenueError}
                  empty={config.empty}
                  columns={config.columns.length}
                  leads={leads}
                  onOpen={actions.openLead}
                />
              ) : rows.length === 0 ? (
                <tr className="crm-table-empty">
                  <td colSpan={config.columns.length}>
                    <div className="crm-empty">
                      <CheckCircle2 size={26} aria-hidden="true" />
                      <strong>{config.empty[0]}</strong>
                      <span>{config.empty[1]}</span>
                    </div>
                  </td>
                </tr>
              ) : pagination.rows.map((lead) => (
                <tr
                  key={lead.id}
                  className="crm-dash-row-link"
                  tabIndex={0}
                  role="link"
                  aria-label={`Open ${lead.hospitalName || "lead"}`}
                  onClick={(event) => openRow(event, lead.id)}
                  onKeyDown={(event) => openRowFromKeyboard(event, lead.id)}
                >
                  {config.cells(lead)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {pagination.total > pagination.pageSize && (
          <div className="crm-pager">
            <Pagination {...pagination} onPageChange={pagination.setPage} />
          </div>
        )}
      </section>
    </div>
  );
}

function RevenueRows({ hospitals, loading, error, empty, columns, leads, onOpen }) {
  const openRow = (event, leadId) => {
    if (event.target.closest("button, a, input, select, textarea")) return;
    onOpen(leadId);
  };

  const openRowFromKeyboard = (event, leadId) => {
    if (event.target !== event.currentTarget || (event.key !== "Enter" && event.key !== " ")) return;
    event.preventDefault();
    onOpen(leadId);
  };

  if (loading) {
    return (
      <tr className="crm-table-empty">
        <td colSpan={columns}><div className="crm-empty"><strong>Loading paid invoices</strong><span>Fetching revenue for your hospitals.</span></div></td>
      </tr>
    );
  }
  if (error || hospitals.length === 0) {
    return (
      <tr className="crm-table-empty">
        <td colSpan={columns}>
          <div className="crm-empty">
            <strong>{empty[0]}</strong>
            <span>{empty[1]}</span>
          </div>
        </td>
      </tr>
    );
  }
  return hospitals.map((hospital) => {
    const lead = leads.find((item) => String(item.hospitalId) === String(hospital.tenantId));
    return (
      <tr key={hospital.tenantId} className={lead ? "crm-row-click" : undefined} tabIndex={lead ? 0 : undefined} role={lead ? "link" : undefined} aria-label={lead ? `Open ${hospital.hospitalName || "lead"}` : undefined} onClick={lead ? (event) => openRow(event, lead.id) : undefined} onKeyDown={lead ? (event) => openRowFromKeyboard(event, lead.id) : undefined}>
        <td>
          {lead ? (
            <button type="button" className="crm-row-link" onClick={() => onOpen(lead.id)}>{hospital.hospitalName || "Hospital"}</button>
          ) : hospital.hospitalName || "Hospital"}
        </td>
        <td>{hospital.plan || "—"}</td>
        <td>{hospital.paidCount}</td>
        <td className="crm-nowrap"><strong>{formatCurrency(hospital.paidAmount)}</strong></td>
      </tr>
    );
  });
}

function Kpi({ active, onClick, icon: Icon, label, value, tone = "", title }) {
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
    </button>
  );
}

import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { BadgeCheck, Hourglass, RotateCcw, XCircle } from "lucide-react";
import Pagination from "../../../shared/components/Pagination";
import SearchBar from "../../../shared/components/SearchBar";
import { usePagination } from "../../../shared/hooks/usePagination";
import { formatCurrency } from "../../../shared/utils/formatCurrency";
import { formatDate } from "../../../shared/utils/formatDate";
import { prepareLeads } from "../../../shared/utils/leadMetrics";
import { daysBetween, localDay } from "../../../shared/utils/periods";
import { includesQuery } from "../../../shared/utils/table";
import HandoverSteps from "../components/HandoverSteps";
import { plural } from "../utils/crmLeads";
import { useCrm } from "../workspace/workspace-context";

const TABS = [
  ["pending", "Agreed · pending Accounts", Hourglass],
  ["registered", "Registered hospitals", BadgeCheck],
  ["lost", "Lost leads", XCircle],
];
const COLUMNS = {
  pending: ["Hospital", "Agreed plan", "Sent to Accounts", "Waiting", "Registration", "Handover", "Note for Accounts"],
  registered: ["Hospital", "Hospital ID", "Plan", "Registered", "Registered by", "Subscription", "Days to convert", "Paid revenue"],
  lost: ["Hospital", "Plan", "Reason", "Note", "Closed", "Closed by"],
};

export default function Conversions() {
  const { leads, hospitals, invoices, today, actions, billingAvailable } = useCrm();
  const [params, setParams] = useSearchParams();
  const tab = TABS.some(([key]) => key === params.get("tab")) ? params.get("tab") : "pending";
  const query = params.get("q") || "";
  const update = (changes) => setParams((current) => {
    const next = new URLSearchParams(current);
    Object.entries(changes).forEach(([key, value]) => (value ? next.set(key, value) : next.delete(key)));
    return next;
  }, { replace: true });

  const facts = useMemo(() => new Map(prepareLeads({ onboarding: leads, hospitals, invoices, today }).map((row) => [row.id, row])), [leads, hospitals, invoices, today]);
  const hospitalsById = useMemo(() => new Map(hospitals.map((hospital) => [hospital.id, hospital])), [hospitals]);
  const groups = useMemo(() => ({
    pending: leads.filter((lead) => lead.status === "Agreed").sort((a, b) => String(a.agreedAt).localeCompare(String(b.agreedAt))),
    registered: leads.filter((lead) => lead.status === "Registered").sort((a, b) => String(b.registeredAt).localeCompare(String(a.registeredAt))),
    lost: leads.filter((lead) => lead.status === "Not Interested").sort((a, b) => String(b.closedAt).localeCompare(String(a.closedAt))),
  }), [leads]);
  const rows = useMemo(() => groups[tab].filter((lead) => includesQuery([lead.hospitalName, lead.contactPerson, lead.hospitalId, lead.city, lead.closeReason], query)), [groups, query, tab]);
  const pagination = usePagination(rows, 10, `${tab}|${query}`);
  const empty = {
    pending: ["Nothing waiting on Accounts", "When a hospital agrees, mark the lead as agreed to hand it over."],
    registered: ["No registered hospitals yet", "Hospitals appear here after Accounts registers them."],
    lost: ["No lost leads", "Leads closed as not interested appear here."],
  }[tab];

  return (
    <div className="crm-page">
      <section className="crm-card">
        <nav className="crm-tabs" role="tablist" aria-label="Conversions">
          {TABS.map(([key, label, Icon]) => (
            <button key={key} type="button" role="tab" aria-selected={tab === key} className={tab === key ? "active" : ""} onClick={() => update({ tab: key === "pending" ? "" : key, q: "" })}>
              <Icon size={14} aria-hidden="true" />{label}<span>{groups[key].length}</span>
            </button>
          ))}
        </nav>
        <div className="crm-toolbar">
          <div className="crm-search">
            <SearchBar value={query} onChange={(value) => update({ q: value })} placeholder="Search hospital, contact, hospital ID…" />
          </div>
          <div className="crm-toolbar-end"><span className="crm-count">{plural(rows.length, "hospital")}</span></div>
        </div>

        <div className="crm-table-wrap">
          <table className="crm-table">
            <thead>
              <tr>
                {COLUMNS[tab].map((column) => <th key={column} scope="col">{column}</th>)}
                <th scope="col" className="is-end">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr className="crm-table-empty">
                  <td colSpan={COLUMNS[tab].length + 1}>
                    <div className="crm-empty">
                      <strong>{query ? "Nothing matches your search" : empty[0]}</strong>
                      <span>{query ? "Try a different name or ID." : empty[1]}</span>
                    </div>
                  </td>
                </tr>
              )}
              {tab === "pending" && pagination.rows.map((lead) => {
                const waiting = daysBetween(localDay(lead.agreedAt), today);
                return (
                  <tr key={lead.id}>
                    <td><button type="button" className="crm-row-link" onClick={() => actions.openLead(lead.id)}>{lead.hospitalName}</button><span className="crm-sub">{lead.city || "—"}</span></td>
                    <td>{lead.plan || "—"}<span className="crm-sub">{lead.billingCycle || "—"}</span></td>
                    <td className="crm-nowrap">{formatDate(lead.agreedAt)}<span className="crm-sub">{lead.agreedBy || "—"}</span></td>
                    <td className="crm-nowrap"><span className={`crm-due ${waiting > 3 ? "crm-due-overdue" : "crm-due-later"}`}>{waiting <= 0 ? "Today" : plural(waiting, "day")}</span></td>
                    <td><span className="crm-badge crm-badge-agreed">Waiting for Accounts</span></td>
                    <td><HandoverSteps lead={lead} today={today} compact /></td>
                    <td><span className="crm-clip" title={lead.handoverNote}>{lead.handoverNote || "—"}</span></td>
                    <td><div className="crm-row-actions"><button type="button" className="crm-link" onClick={() => actions.openLead(lead.id)}>View</button></div></td>
                  </tr>
                );
              })}
              {tab === "registered" && pagination.rows.map((lead) => {
                const fact = facts.get(lead.id);
                const hospital = hospitalsById.get(lead.hospitalId);
                const days = lead.registeredAt ? daysBetween(localDay(lead.submittedAt), localDay(lead.registeredAt)) : null;
                return (
                  <tr key={lead.id}>
                    <td><button type="button" className="crm-row-link" onClick={() => actions.openLead(lead.id)}>{lead.hospitalName}</button><span className="crm-sub">{lead.city || "—"}</span></td>
                    <td className="crm-mono">{lead.hospitalId || "—"}</td>
                    <td>{hospital?.plan || lead.plan || "—"}<span className="crm-sub">{hospital?.billingCycle || lead.billingCycle || "—"}</span></td>
                    <td className="crm-nowrap">{formatDate(lead.registeredAt)}</td>
                    <td>{lead.registeredBy || "—"}</td>
                    <td>{billingAvailable && hospital
                      ? <span className={`crm-badge crm-badge-${hospital.subscriptionStatus === "Active" ? "converted" : hospital.subscriptionStatus === "Trial" ? "new" : "closed"}`}>{hospital.subscriptionStatus}</span>
                      : <span className="crm-sub">Unavailable</span>}
                    </td>
                    <td>{days === null ? "—" : plural(days, "day")}</td>
                    <td className="crm-nowrap">{billingAvailable && fact?.paidInvoices.length ? formatCurrency(fact.revenue) : <span className="crm-sub">{billingAvailable ? "No paid invoices" : "Unavailable"}</span>}</td>
                    <td><div className="crm-row-actions"><button type="button" className="crm-link" onClick={() => actions.openLead(lead.id)}>View</button></div></td>
                  </tr>
                );
              })}
              {tab === "lost" && pagination.rows.map((lead) => (
                <tr key={lead.id}>
                  <td><button type="button" className="crm-row-link" onClick={() => actions.openLead(lead.id)}>{lead.hospitalName}</button><span className="crm-sub">{lead.city || "—"}</span></td>
                  <td>{lead.plan || "—"}</td>
                  <td>{lead.closeReason || "—"}</td>
                  <td><span className="crm-clip" title={lead.closeNote}>{lead.closeNote || "—"}</span></td>
                  <td className="crm-nowrap">{formatDate(lead.closedAt)}</td>
                  <td>{lead.closedBy || "—"}</td>
                  <td>
                    <div className="crm-row-actions">
                      <button type="button" className="crm-link" onClick={() => actions.openLead(lead.id)}>View</button>
                      <button type="button" className="crm-link is-outline" onClick={() => actions.reopen(lead)}><RotateCcw size={13} aria-hidden="true" />Reopen</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {rows.length > 0 && (
          <div className="crm-pager">
            <Pagination {...pagination} onPageChange={pagination.setPage} />
          </div>
        )}
      </section>
    </div>
  );
}

import { useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { Hand, Inbox, Lock, Plus, SearchX } from "lucide-react";
import Button from "../../../shared/components/Button";
import Pagination from "../../../shared/components/Pagination";
import SearchBar from "../../../shared/components/SearchBar";
import { formatPhoneDisplay } from "../../../shared/utils/phoneNumbers";
import { usePagination } from "../../../shared/hooks/usePagination";
import { formatDate } from "../../../shared/utils/formatDate";
import { shiftDays } from "../../../shared/utils/periods";
import { includesQuery } from "../../../shared/utils/table";
import { FollowMark, PriorityMark, StatusMark } from "../components/CrmMarks";
import Filter from "../components/CrmFilter";
import { crmTabPanelProps, crmTabProps, onCrmTabKeyDown, useCrmTabIds } from "../components/crmTabs";
import { CLAIM_LIMIT, ORIGINS, POOL_ORIGINS, followBucket, followMeta, isOpen, leadAge, leadOrigin, plural } from "../utils/crmLeads";
import { useCrm } from "../workspace/workspace-context";

const TABS = [
  ["open", "Open"],
  ["New", "New"],
  ["Contacted", "Contacted"],
  ["Agreed", "Agreed"],
  ["Registered", "Registered"],
  ["Not Interested", "Not interested"],
  ["all", "All"],
];
const FOLLOW_FILTERS = [
  ["overdue", "Overdue"],
  ["today", "Due today"],
  ["week", "Next 7 days"],
  ["unscheduled", "Not scheduled"],
];
const FILTER_KEYS = ["q", "priority", "plan", "follow", "origin"];
// The empty slot is the tab-dependent follow-up / reason column.
const LEAD_COLUMNS = ["Hospital", "Contact", "Phone", "City", "Plan", "Priority", "Status", "", "Created"];
const NEXT_HEADERS = { "Not Interested": "Not interested reason", all: "Next follow-up / reason" };

function openRow(event, open) {
  if (event.target.closest("button, a, input, select, textarea")) return;
  open();
}

function openRowFromKeyboard(event, open) {
  if (event.target !== event.currentTarget || (event.key !== "Enter" && event.key !== " ")) return;
  event.preventDefault();
  open();
}

function matchesTab(lead, tab) {
  if (tab === "all") return true;
  if (tab === "open") return isOpen(lead);
  return lead.status === tab;
}

export default function Leads() {
  const { me, leads, pool, uncontacted, today, actions } = useCrm();
  const [params, setParams] = useSearchParams();
  const tabIds = useCrmTabIds("leads-");
  const tab = TABS.some(([key]) => key === params.get("tab")) ? params.get("tab") : "open";
  const inPool = tab === "New";
  const query = params.get("q") || "";
  const priority = params.get("priority") || "";
  const plan = params.get("plan") || "";
  const follow = inPool ? "" : params.get("follow") || "";
  const origins = inPool ? POOL_ORIGINS : ORIGINS;
  const origin = origins[params.get("origin")] ? params.get("origin") : "";
  const focus = params.get("focus");
  const showNextStep = !["Contacted", "Agreed", "Registered", "all"].includes(tab);
  const leadColumns = showNextStep ? LEAD_COLUMNS : LEAD_COLUMNS.filter(Boolean);

  useEffect(() => {
    if (!focus) return;
    if (leads.some((lead) => String(lead.id) === String(focus)) || pool.some((lead) => String(lead.id) === String(focus))) {
      actions.openLead(focus, { replace: true });
      return;
    }
    setParams((current) => {
      const next = new URLSearchParams(current);
      next.delete("focus");
      next.delete("open");
      next.delete("action");
      return next;
    }, { replace: true });
  }, [focus]); // eslint-disable-line react-hooks/exhaustive-deps

  const update = (changes) => {
    setParams((current) => {
      const next = new URLSearchParams(current);
      Object.entries(changes).forEach(([key, value]) => {
        if (value) next.set(key, value);
        else next.delete(key);
      });
      return next;
    }, { replace: true });
  };

  const plans = useMemo(() => [...new Set([...leads, ...pool].map((lead) => lead.plan).filter(Boolean))].sort(), [leads, pool]);
  const counts = useMemo(() => Object.fromEntries(TABS.map(([key]) => [key, key === "New" ? pool.length : leads.filter((lead) => matchesTab(lead, key)).length])), [leads, pool]);

  const rows = useMemo(() => {
    const weekEnd = shiftDays(today, 7);
    const source = inPool ? pool : leads.filter((lead) => matchesTab(lead, tab));
    const filtered = source.filter((lead) => {
      if (priority && (lead.priority || "Medium") !== priority) return false;
      if (plan && lead.plan !== plan) return false;
      if (origin && leadOrigin(lead, me) !== origin) return false;
      if (follow) {
        const bucket = followBucket(lead, today);
        if (follow === "week" ? !(isOpen(lead) && lead.followUpDate >= today && lead.followUpDate <= weekEnd) : bucket !== follow) return false;
      }
      const searchable = inPool
        ? [lead.hospitalName, lead.city, lead.state, lead.message]
        : [lead.hospitalName, lead.contactPerson, lead.contactPhone, lead.contactEmail, lead.city, lead.state];
      return includesQuery(searchable, query);
    });
    return filtered.sort((a, b) => String(b.submittedAt).localeCompare(String(a.submittedAt)));
  }, [follow, inPool, leads, me, origin, plan, pool, priority, query, tab, today]);

  const filtersOn = FILTER_KEYS.some((key) => params.get(key));
  const pagination = usePagination(rows, 10, params.toString());
  const clearFilters = () => update(Object.fromEntries(FILTER_KEYS.map((key) => [key, ""])));
  const atLimit = uncontacted >= CLAIM_LIMIT;

  return (
    <div className="crm-page">
      <div className="crm-page-bar">
        <div className="crm-page-actions">
          <Button onClick={actions.addLead}><Plus size={16} aria-hidden="true" />Add lead</Button>
        </div>
      </div>

      <section className="crm-card">
        <nav className="crm-tabs" role="tablist" aria-label="Lead status" onKeyDown={onCrmTabKeyDown}>
          {TABS.map(([key, label]) => (
            <button
              key={key}
              type="button"
              className={`${tab === key ? "active" : ""}${key === "New" && pool.length ? " is-info" : ""}`}
              {...crmTabProps(tabIds.tabId(key), tab === key, tabIds.panelId)}
              onClick={() => update({
                tab: key === "open" ? "" : key,
                follow: key === "New" ? "" : params.get("follow") || "",
                origin: (key === "New") === inPool ? origin : "",
              })}
            >
              {label}<span>{counts[key]}</span>
            </button>
          ))}
        </nav>
        <div {...crmTabPanelProps(tabIds.panelId, tabIds.tabId(tab))}>
        <div className="crm-toolbar">
          <div className="crm-search">
            <SearchBar value={query} onChange={(value) => update({ q: value })} placeholder={inPool ? "Search hospital, city, requirement…" : "Search name, contact, phone…"} />
          </div>
          <Filter label="Priority" value={priority} onChange={(value) => update({ priority: value })} options={["High", "Medium", "Low"]} />
          <Filter label="Plan" value={plan} onChange={(value) => update({ plan: value })} options={plans} />
          {!inPool && <Filter label="Follow-up" value={follow} onChange={(value) => update({ follow: value })} options={FOLLOW_FILTERS} />}
          <Filter label="Lead origin" value={origin} onChange={(value) => update({ origin: value })} options={Object.entries(origins)} />
          <div className="crm-toolbar-end">
            <span className="crm-count" aria-live="polite">{inPool ? `${rows.length} ${rows.length === 1 ? "enquiry" : "enquiries"}` : plural(rows.length, "lead")}</span>
            <button type="button" className="crm-clear" disabled={!filtersOn} onClick={clearFilters}>Clear filters</button>
          </div>
        </div>

        {inPool && (
          <p className={`crm-callout ${atLimit ? "crm-callout-warn" : "crm-callout-info"} crm-pool-note`}>
            {atLimit ? <Hand size={16} aria-hidden="true" /> : <Lock size={16} aria-hidden="true" />}
            <span>
              {atLimit
                ? `You have ${CLAIM_LIMIT} new leads you haven't contacted yet. Contact one of them before claiming more.`
                : `Claim an enquiry to unlock its contact details. It moves to your Open list and no one else can claim it. You can hold up to ${CLAIM_LIMIT} new leads you haven't contacted (you have ${uncontacted}).`}
            </span>
          </p>
        )}

        {inPool ? (
          <PoolTable
            rows={pagination.rows}
            me={me}
            empty={pool.length === 0}
            filtersOn={filtersOn}
            today={today}
            atLimit={atLimit}
            onClaim={actions.claim}
            onClear={clearFilters}
          />
        ) : (
          <div className="crm-table-wrap">
            <table className="crm-table crm-leads-table">
              <thead>
                <tr>
                  {leadColumns.map((column) => (
                    <th key={column} scope="col">{column || NEXT_HEADERS[tab] || "Next follow-up"}</th>
                  ))}
                  <th scope="col" className="is-end">Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && (
                  <tr className="crm-table-empty">
                    <td colSpan={leadColumns.length + 1}>
                      {leads.length === 0 ? (
                        <div className="crm-empty">
                          <Inbox size={28} aria-hidden="true" />
                          <strong>No leads assigned to you yet</strong>
                          <span>Claim an enquiry from New, or add a lead from a call, referral or walk-in.</span>
                          <Button size="sm" onClick={actions.addLead}><Plus size={14} aria-hidden="true" />Add lead</Button>
                        </div>
                      ) : (
                        <div className="crm-empty">
                          <SearchX size={28} aria-hidden="true" />
                          <strong>{filtersOn ? "No leads match these filters" : "No leads here yet"}</strong>
                          <span>{filtersOn ? "Try another tab or clear the filters." : "Leads appear here when they reach this stage."}</span>
                          {filtersOn && <Button size="sm" variant="secondary" onClick={clearFilters}>Clear filters</Button>}
                        </div>
                      )}
                    </td>
                  </tr>
                )}
                {pagination.rows.map((lead) => (
                  <tr key={lead.id} className="crm-row-click" tabIndex={0} role="link" aria-label={`Open ${lead.hospitalName || "lead"}`} onClick={(event) => openRow(event, () => actions.openLead(lead.id))} onKeyDown={(event) => openRowFromKeyboard(event, () => actions.openLead(lead.id))}>
                    <td>
                      <button type="button" className="crm-row-link" onClick={() => actions.openLead(lead.id)}>{lead.hospitalName}</button>
                      {lead.type && <span className="crm-sub">{lead.type}</span>}
                    </td>
                    <td>{lead.contactPerson || "—"}{lead.designation && <span className="crm-sub">{lead.designation}</span>}</td>
                    <td className="crm-nowrap">{formatPhoneDisplay(lead.contactPhone) || "—"}</td>
                    <td>{lead.city || "—"}</td>
                    <td>{lead.plan || "—"}{lead.billingCycle && <span className="crm-sub">{lead.billingCycle}</span>}</td>
                    <td><PriorityMark value={lead.priority} /></td>
                    <td><StatusMark status={lead.status} /></td>
                    {showNextStep && <td><NextStep lead={lead} today={today} /></td>}
                    <td className="crm-nowrap">{formatDate(lead.submittedAt)}<span className="crm-sub">{ORIGINS[leadOrigin(lead, me)]}</span></td>
                    <td>
                      <div className="crm-row-actions">
                        <button type="button" className="crm-link" onClick={() => actions.openLead(lead.id)}>View</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {rows.length > 0 && (
          <div className="crm-pager">
            <Pagination {...pagination} onPageChange={pagination.setPage} />
          </div>
        )}
        </div>
      </section>
    </div>
  );
}

function NextStep({ lead, today }) {
  if (isOpen(lead)) return <FollowMark meta={followMeta(lead.followUpDate, today)} />;
  if (lead.status === "Not Interested") {
    return (
      <span className="crm-close-reason" title={lead.closeNote || undefined}>
        <strong>{lead.closeReason || "No reason recorded"}</strong>
        {lead.closeNote && <span className="crm-sub">{lead.closeNote}</span>}
      </span>
    );
  }
  return <span className="crm-sub">—</span>;
}

function PoolTable({ rows, me, empty, filtersOn, today, atLimit, onClaim, onClear }) {
  const columns = ["Hospital", "City", "Requirement", "Plan", "Source", "Priority", "Received"];
  return (
    <div className="crm-table-wrap">
      <table className="crm-table crm-pool-table">
        <thead>
          <tr>
            {columns.map((column) => <th key={column} scope="col">{column}</th>)}
            <th scope="col" className="is-end">Action</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr className="crm-table-empty">
              <td colSpan={columns.length + 1}>
                <div className="crm-empty">
                  <Inbox size={26} aria-hidden="true" />
                  <strong>{empty ? "No new enquiries" : "No enquiries match these filters"}</strong>
                  <span>{empty ? "Website and phone enquiries that nobody has claimed yet appear here." : "Try different filters."}</span>
                  {!empty && filtersOn && <Button size="sm" variant="secondary" onClick={onClear}>Clear filters</Button>}
                </div>
              </td>
            </tr>
          ) : rows.map((lead) => (
            <tr key={lead.id}>
              <td>
                <strong className="crm-pool-name">{lead.hospitalName}</strong>
                {lead.type && <span className="crm-sub">{lead.type}</span>}
              </td>
              <td>{lead.city || "—"}{lead.state && <span className="crm-sub">{lead.state}</span>}</td>
              <td><span className="crm-pool-need" title={lead.message}>{lead.message || "—"}</span></td>
              <td>{lead.plan || "—"}{lead.billingCycle && <span className="crm-sub">{lead.billingCycle}</span>}</td>
              <td className="crm-nowrap">{lead.source || "—"}{leadOrigin(lead, me) === "shared" && <span className="crm-sub">Shared by you</span>}</td>
              <td><PriorityMark value={lead.priority} /></td>
              <td className="crm-nowrap">{formatDate(lead.submittedAt)}<span className="crm-sub">{leadAge(lead.submittedAt, today)}</span></td>
              <td>
                <div className="crm-row-actions">
                  <Button size="sm" disabled={atLimit} onClick={() => onClaim(lead)}><Hand size={14} aria-hidden="true" />Claim</Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

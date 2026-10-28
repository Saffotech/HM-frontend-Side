import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { CalendarClock, CalendarX2, CheckCircle2, Phone } from "lucide-react";
import Pagination from "../../../shared/components/Pagination";
import SearchBar from "../../../shared/components/SearchBar";
import { usePagination } from "../../../shared/hooks/usePagination";
import { formatDate } from "../../../shared/utils/formatDate";
import { formatPhoneDisplay } from "../../../shared/utils/phoneNumbers";
import { followUpsFor } from "../../../shared/utils/leadMetrics";
import { daysBetween } from "../../../shared/utils/periods";
import { includesQuery } from "../../../shared/utils/table";
import Filter from "../components/CrmFilter";
import { crmTabPanelProps, crmTabProps, onCrmTabKeyDown, useCrmTabIds } from "../components/crmTabs";
import { FollowMark, PriorityMark } from "../components/CrmMarks";
import { followBucket, followMeta, lastContact, plural, priorityRank } from "../utils/crmLeads";
import { useCrm } from "../workspace/workspace-context";

const VIEWS = [
  ["today", "Today"],
  ["overdue", "Overdue"],
  ["upcoming", "Upcoming"],
  ["unscheduled", "Not scheduled"],
  ["completed", "Completed"],
];
const EMPTY = {
  today: ["Nothing due today", "Upcoming follow-ups appear here on the day they're due."],
  overdue: ["No overdue follow-ups", "You're on schedule."],
  upcoming: ["No upcoming follow-ups", "Schedule one from any open lead."],
  unscheduled: ["Every open lead has a follow-up date", "Nice — nothing is slipping through."],
  completed: ["No completed follow-ups yet", "Logging a contact on a lead with a due follow-up completes it."],
};
const byPriority = (a, b) => (priorityRank[a.priority] ?? 1) - (priorityRank[b.priority] ?? 1);
const dueText = (day) => formatDate(`${day}T00:00:00`);

function openRow(event, open) {
  if (event.target.closest("button, a, input, select, textarea")) return;
  open();
}

function openRowFromKeyboard(event, open) {
  if (event.target !== event.currentTarget || (event.key !== "Enter" && event.key !== " ")) return;
  event.preventDefault();
  open();
}

export default function FollowUps() {
  const { leads, today, actions } = useCrm();
  const [params, setParams] = useSearchParams();
  const tabIds = useCrmTabIds("follow-ups-");
  const view = VIEWS.some(([key]) => key === params.get("view")) ? params.get("view") : "today";
  const query = params.get("q") || "";
  const priority = params.get("priority") || "";

  const update = (changes) => setParams((current) => {
    const next = new URLSearchParams(current);
    Object.entries(changes).forEach(([key, value]) => (value ? next.set(key, value) : next.delete(key)));
    return next;
  }, { replace: true });

  const groups = useMemo(() => {
    const by = { today: [], overdue: [], upcoming: [], unscheduled: [] };
    leads.forEach((lead) => by[followBucket(lead, today)]?.push(lead));
    by.overdue.sort((a, b) => a.followUpDate.localeCompare(b.followUpDate) || byPriority(a, b));
    by.today.sort(byPriority);
    by.upcoming.sort((a, b) => a.followUpDate.localeCompare(b.followUpDate) || byPriority(a, b));
    by.unscheduled.sort((a, b) => byPriority(a, b) || String(b.submittedAt).localeCompare(String(a.submittedAt)));
    by.completed = leads
      .flatMap((lead) => followUpsFor(lead)
        .filter((item) => item.completedAt)
        .map((item) => ({ ...item, lead, entry: (lead.activity || []).find((entry) => entry.at === item.completedAt) })))
      .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));
    return by;
  }, [leads, today]);

  const rows = useMemo(() => groups[view].filter((row) => {
    const lead = row.lead || row;
    if (priority && (lead.priority || "Medium") !== priority) return false;
    return includesQuery([lead.hospitalName, lead.contactPerson, lead.contactPhone, lead.nextAction], query);
  }), [groups, priority, query, view]);
  const pagination = usePagination(rows, 10, `${view}|${query}|${priority}`);
  const [emptyTitle, emptyCopy] = EMPTY[view];
  const columns = view === "completed"
    ? ["Hospital", "Was due", "Completed", "Timing", "How", "Notes"]
    : ["Hospital", "Contact", "Priority", view === "unscheduled" ? "Status" : "Due", "Next action", "Last contact"];

  return (
    <div className="crm-page">
      <section className="crm-card">
        <nav className="crm-tabs" role="tablist" aria-label="Follow-up views" onKeyDown={onCrmTabKeyDown}>
          {VIEWS.map(([key, label]) => (
            <button
              key={key}
              type="button"
              className={`${view === key ? "active" : ""}${key === "overdue" && groups.overdue.length ? " is-alert" : ""}`}
              {...crmTabProps(tabIds.tabId(key), view === key, tabIds.panelId)}
              onClick={() => update({ view: key === "today" ? "" : key })}
            >
              {label}<span>{groups[key].length}</span>
            </button>
          ))}
        </nav>
        <div {...crmTabPanelProps(tabIds.panelId, tabIds.tabId(view))}>
        <div className="crm-toolbar">
          <div className="crm-search">
            <SearchBar value={query} onChange={(value) => update({ q: value })} placeholder="Search hospital, contact, next action…" />
          </div>
          <Filter label="" ariaLabel="Filter by priority" allLabel="All priorities" value={priority} onChange={(value) => update({ priority: value })} options={["High", "Medium", "Low"]} />
        </div>

        <div className="crm-table-wrap">
          <table className="crm-table">
            <thead>
              <tr>
                {columns.map((column) => <th key={column} scope="col">{column}</th>)}
                {view !== "completed" && <th scope="col" className="crm-followup-action-head">Action</th>}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr className="crm-table-empty">
                  <td colSpan={columns.length + (view === "completed" ? 0 : 1)}>
                    <div className="crm-empty">
                      {view === "unscheduled" || view === "overdue" ? <CheckCircle2 size={28} aria-hidden="true" /> : <CalendarX2 size={28} aria-hidden="true" />}
                      <strong>{query || priority ? "Nothing matches these filters" : emptyTitle}</strong>
                      <span>{query || priority ? "Clear the search or priority filter." : emptyCopy}</span>
                    </div>
                  </td>
                </tr>
              ) : view === "completed" ? (
                pagination.rows.map((row) => {
                  const late = daysBetween(row.due, row.completedDay);
                  return (
                    <tr key={`${row.lead.id}-${row.due}-${row.completedAt}`} className="crm-row-click" tabIndex={0} role="link" aria-label={`Open ${row.lead.hospitalName || "lead"}`} onClick={(event) => openRow(event, () => actions.openLead(row.lead.id))} onKeyDown={(event) => openRowFromKeyboard(event, () => actions.openLead(row.lead.id))}>
                      <td>
                        <button type="button" className="crm-row-link" onClick={() => actions.openLead(row.lead.id)}>{row.lead.hospitalName}</button>
                        <span className="crm-sub">{row.lead.city || "—"}</span>
                      </td>
                      <td className="crm-nowrap">{dueText(row.due)}</td>
                      <td className="crm-nowrap">{formatDate(row.completedAt)}<span className="crm-sub">{row.entry?.by || "—"}</span></td>
                      <td>
                        <span className={`crm-due ${late > 0 ? "crm-due-overdue" : "crm-due-today"}`}>
                          {late > 0 ? `${plural(late, "day")} late` : late < 0 ? "Early" : "On time"}
                        </span>
                      </td>
                      <td>{row.entry?.method || "—"}{row.entry?.outcome && <span className="crm-sub">{row.entry.outcome}</span>}</td>
                      <td><span className="crm-clip" title={row.entry?.note}>{row.entry?.note || "—"}</span></td>
                    </tr>
                  );
                })
              ) : (
                pagination.rows.map((lead) => {
                  const contact = lastContact(lead);
                  const overdueBy = view === "overdue" ? daysBetween(lead.followUpDate, today) : 0;
                  return (
                    <tr key={lead.id} className="crm-row-click" tabIndex={0} role="link" aria-label={`Open ${lead.hospitalName || "lead"}`} onClick={(event) => openRow(event, () => actions.openLead(lead.id))} onKeyDown={(event) => openRowFromKeyboard(event, () => actions.openLead(lead.id))}>
                      <td>
                        <button type="button" className="crm-row-link" onClick={() => actions.openLead(lead.id)}>{lead.hospitalName}</button>
                        <span className="crm-sub">{lead.city || "—"}</span>
                      </td>
                      <td>{lead.contactPerson}<span className="crm-sub">{formatPhoneDisplay(lead.contactPhone)}</span></td>
                      <td><PriorityMark value={lead.priority} /></td>
                      <td>
                        {view === "unscheduled" ? (
                          <span className="crm-sub">{lead.status === "New" ? "Not contacted yet" : "No follow-up date"}</span>
                        ) : view === "overdue" ? (
                          <span className="crm-due crm-due-overdue">{plural(overdueBy, "day")} overdue<small>Due {dueText(lead.followUpDate)}</small></span>
                        ) : (
                          <FollowMark meta={followMeta(lead.followUpDate, today)} />
                        )}
                      </td>
                      <td><span className="crm-clip" title={lead.nextAction}>{lead.nextAction || "—"}</span></td>
                      <td className="crm-nowrap">{contact ? <>{contact.method}<span className="crm-sub">{formatDate(contact.at)}</span></> : <span className="crm-sub">Never</span>}</td>
                      <td>
                        <div className="crm-row-actions crm-followup-actions">
                          {view === "unscheduled" ? (
                            <>
                              <button type="button" className="crm-link is-outline" onClick={() => actions.schedule(lead)}><CalendarClock size={13} aria-hidden="true" />Schedule</button>
                              <button type="button" className="crm-link" onClick={() => actions.logContact(lead)}><Phone size={13} aria-hidden="true" />Log contact</button>
                            </>
                          ) : (
                            <>
                              <button type="button" className="crm-link is-outline" onClick={() => actions.logContact(lead, "complete")}><CheckCircle2 size={13} aria-hidden="true" />Complete</button>
                              <button type="button" className="crm-link" onClick={() => actions.schedule(lead)}><CalendarClock size={13} aria-hidden="true" />Reschedule</button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
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

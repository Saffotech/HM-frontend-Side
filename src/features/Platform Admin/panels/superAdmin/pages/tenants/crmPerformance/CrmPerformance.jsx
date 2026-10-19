import { useEffect, useMemo, useState } from "react";
import {
  AlarmClock,
  Building2,
  Calendar,
  Handshake,
  IndianRupee,
  Phone,
  Target,
  Users,
} from "lucide-react";
import Button from "../../../../../shared/components/Button";
import Select from "../../../../../shared/components/Select";
import { listLeads, mapLeadList } from "../../../../../shared/api/leadApi";
import { PLAN_NAMES } from "../../../../../shared/data/catalog";
import { usePlatform } from "../../../../../shared/context/PlatformContext";
import { todayInput } from "../../../../../shared/utils/formatDate";
import "./CrmPerformance.css";

const EMPTY_FILTERS = { query: "", status: "", plan: "", period: "all" };

function inPeriod(lead, period, today) {
  if (period === "all" || !lead.submittedAt) return period === "all";
  const day = String(lead.submittedAt).slice(0, 10);
  if (period === "month") return day.slice(0, 7) === today.slice(0, 7);
  if (period === "quarter") {
    const date = new Date(`${day}T00:00:00`);
    const now = new Date(`${today}T00:00:00`);
    if (Number.isNaN(date.getTime())) return false;
    const quarter = Math.floor(date.getMonth() / 3);
    return date.getFullYear() === now.getFullYear() && quarter === Math.floor(now.getMonth() / 3);
  }
  return true;
}

function rate(part, total) {
  if (!total) return "—";
  return `${((part / total) * 100).toFixed(0)}%`;
}

export default function CrmPerformance() {
  const { sessionFor } = usePlatform();
  const session = sessionFor("platform");
  const today = todayInput();
  const [leads, setLeads] = useState([]);
  const [note, setNote] = useState("");
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const set = (key, value) => setFilters((current) => ({ ...current, [key]: value }));

  useEffect(() => {
    let active = true;
    listLeads()
      .then((body) => {
        if (!active) return;
        const rows = mapLeadList(Array.isArray(body) ? body : body?.items || body?.leads || [], session);
        setLeads(rows);
        setNote(rows.length ? "" : "No leads are visible to this account. Company-wide rankings need a CRM analytics API.");
      })
      .catch(() => {
        if (!active) return;
        setLeads([]);
        setNote("Leads could not be loaded. The report layout stays available.");
      });
    return () => { active = false; };
  }, [session]);

  const visible = useMemo(() => leads.filter((lead) => {
    const haystack = `${lead.hospitalName} ${lead.city} ${lead.assignedTo} ${lead.source}`.toLowerCase();
    if (filters.query && !haystack.includes(filters.query.trim().toLowerCase())) return false;
    if (filters.status && lead.status !== filters.status) return false;
    if (filters.plan && lead.plan !== filters.plan) return false;
    return inPeriod(lead, filters.period, today);
  }), [leads, filters, today]);

  const contacted = visible.filter((lead) => lead.status === "Contacted" || (lead.activity || []).length > 0).length;
  const agreed = visible.filter((lead) => lead.agreedAt || lead.status === "Agreed").length;
  const registered = visible.filter((lead) => lead.status === "Registered" || lead.registeredAt).length;
  const overdue = visible.filter((lead) => lead.followUpDate && lead.followUpDate < today && lead.status !== "Registered" && lead.status !== "Closed").length;
  const followUps = visible.filter((lead) => lead.followUpDate).length;

  const owners = useMemo(() => {
    const groups = new Map();
    visible.forEach((lead) => {
      const name = lead.assignedTo || "Unassigned";
      const row = groups.get(name) || { name, leads: 0, contacted: 0, agreed: 0, registered: 0 };
      row.leads += 1;
      if (lead.status === "Contacted" || (lead.activity || []).length > 0) row.contacted += 1;
      if (lead.agreedAt || lead.status === "Agreed") row.agreed += 1;
      if (lead.status === "Registered" || lead.registeredAt) row.registered += 1;
      groups.set(name, row);
    });
    return [...groups.values()].sort((left, right) => right.registered - left.registered || right.leads - left.leads);
  }, [visible]);

  const kpis = [
    { label: "Leads", value: visible.length, hint: "Visible here", icon: Users },
    { label: "Contacted", value: contacted, hint: "With activity", icon: Phone },
    { label: "Agreed", value: agreed, hint: "Sent onward", icon: Handshake },
    { label: "Registered", value: registered, hint: "Became hospitals", icon: Building2 },
    { label: "Conversion", value: rate(registered, visible.length), hint: "Registered / leads", icon: Target },
    { label: "Follow-ups", value: followUps, hint: "With a due date", icon: Calendar },
    { label: "Overdue", value: overdue, hint: "Past the due date", icon: AlarmClock, late: overdue > 0 },
    { label: "Revenue", value: "—", hint: "No billing API", icon: IndianRupee },
  ];

  const top = owners.find((owner) => owner.name !== "Unassigned") || null;

  return (
    <section className="cp-page">
      <header className="cp-page-head">
        <h2>CRM & Performance</h2>
      </header>
      {note && <p className="cp-card-note" style={{ margin: 0 }}>{note}</p>}

      <div className="cp-filters">
        <label className="field">
          <span className="field-label">Search</span>
          <input value={filters.query} onChange={(event) => set("query", event.target.value)} placeholder="Hospital, city, owner" />
        </label>
        <Select label="Period" value={filters.period} onChange={(event) => set("period", event.target.value)}>
          <option value="all">All dates</option>
          <option value="month">This month</option>
          <option value="quarter">This quarter</option>
        </Select>
        <Select label="Status" value={filters.status} onChange={(event) => set("status", event.target.value)}>
          <option value="">All statuses</option>
          {["New", "Contacted", "Agreed", "Registered", "Closed"].map((status) => <option key={status}>{status}</option>)}
        </Select>
        <Select label="Plan" value={filters.plan} onChange={(event) => set("plan", event.target.value)}>
          <option value="">All plans</option>
          {PLAN_NAMES.map((plan) => <option key={plan}>{plan}</option>)}
        </Select>
        <div className="cp-filter-actions">
          <Button variant="secondary" onClick={() => setFilters(EMPTY_FILTERS)}>Reset</Button>
        </div>
      </div>

      <div className="cp-kpis" aria-label="CRM metrics">
        {kpis.map((item) => {
          const Icon = item.icon;
          return (
            <article key={item.label} className={`cp-kpi${item.late ? " late" : ""}`}>
              <header><Icon size={14} aria-hidden="true" /><span>{item.label}</span></header>
              <strong>{item.value}</strong>
              <small>{item.hint}</small>
            </article>
          );
        })}
      </div>

      <div className="cp-exec">
        <section className="cp-card cp-top">
          <div className="cp-exec-head"><Target size={14} aria-hidden="true" /><h2>Top performer</h2></div>
          {top ? (
            <>
              <button type="button" className="cp-top-name">{top.name}</button>
              <p className="cp-top-meta">{top.leads} leads in this view</p>
              <dl className="cp-top-stats">
                <div><dt>Agreed</dt><dd>{top.agreed}</dd></div>
                <div><dt>Registered</dt><dd>{top.registered}</dd></div>
                <div><dt>Rate</dt><dd>{rate(top.registered, top.leads)}</dd></div>
              </dl>
            </>
          ) : <p className="cp-empty-block">No assigned employee in the leads this account can see.</p>}
        </section>

        <section className="cp-highlights">
          <article className="cp-card cp-highlight"><span>Conversion</span><strong>{rate(registered, visible.length)}</strong></article>
          <article className="cp-card cp-highlight"><span>Registered</span><strong>{registered}</strong></article>
          <article className="cp-card cp-highlight"><span>Overdue follow-ups</span><strong>{overdue}</strong></article>
        </section>

        <section className="cp-card cp-attention">
          <div className="cp-exec-head"><AlarmClock size={14} aria-hidden="true" /><h2>Needs attention</h2></div>
          {overdue === 0 ? <p className="cp-empty-block">No overdue follow-ups in this view.</p> : (
            <ul>
              {visible.filter((lead) => lead.followUpDate && lead.followUpDate < today).slice(0, 4).map((lead) => (
                <li key={lead.id}>
                  <strong>{lead.hospitalName || "Lead"}</strong>
                  <ul><li>Follow-up {lead.followUpDate}</li></ul>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="cp-card cp-leaderboard">
        <div className="cp-card-head">
          <div>
            <h2>Leaderboard</h2>
            <p>Ranked from the leads this account can see.</p>
          </div>
        </div>
        <div className="cp-table-scroll">
          <table className="cp-table">
            <thead>
              <tr>
                <th className="cp-rank-col">Rank</th>
                <th>Employee</th>
                <th className="num">Leads</th>
                <th className="num">Contacted</th>
                <th className="num">Agreed</th>
                <th className="num">Registered</th>
                <th className="num">Conversion</th>
                <th className="num">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {owners.length === 0 ? (
                <tr><td colSpan={8}><p className="cp-empty">No employees to rank yet.</p></td></tr>
              ) : owners.map((owner, index) => (
                <tr key={owner.name} className={index === 0 ? "cp-row-top" : ""}>
                  <td><span className={`cp-rank${index === 0 ? " cp-rank-top" : ""}`}>{index + 1}</span></td>
                  <td><span className="cp-person"><strong>{owner.name}</strong><span>{rate(owner.registered, owner.leads)} converted</span></span></td>
                  <td className="num">{owner.leads}</td>
                  <td className="num">{owner.contacted}</td>
                  <td className="num">{owner.agreed}</td>
                  <td className="num strong">{owner.registered}</td>
                  <td className="num">{rate(owner.registered, owner.leads)}</td>
                  <td className="num">—</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="cp-card">
        <div className="cp-card-head">
          <div>
            <h2>Follow-ups</h2>
            <p>Open dates from the same lead list.</p>
          </div>
        </div>
        <div className="cp-table-scroll">
          <table className="cp-table">
            <thead>
              <tr>
                <th>Hospital</th>
                <th>Owner</th>
                <th>Due</th>
                <th>Status</th>
                <th>Plan</th>
              </tr>
            </thead>
            <tbody>
              {visible.filter((lead) => lead.followUpDate).length === 0 ? (
                <tr><td colSpan={5}><p className="cp-empty">No follow-ups in this view.</p></td></tr>
              ) : visible.filter((lead) => lead.followUpDate).map((lead) => (
                <tr key={lead.id}>
                  <td className="cp-name">{lead.hospitalName || "Lead"}</td>
                  <td>{lead.assignedTo || "Unassigned"}</td>
                  <td className={lead.followUpDate < today ? "cp-late" : ""}>{lead.followUpDate}</td>
                  <td>{lead.status || "—"}</td>
                  <td>{lead.plan || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
}

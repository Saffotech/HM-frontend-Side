import { Trophy } from "lucide-react";
import { useState } from "react";
import { formatCurrency } from "../../../../../shared/utils/formatCurrency";
import { formatRate, ratio } from "./metrics";

const RATING_TONES = {
  Excellent: "excellent",
  Good: "good",
  Average: "average",
  "Needs Attention": "attention",
  "No leads": "none",
};

export function RatingBadge({ rating }) {
  return <span className={`cp-rating cp-rating-${RATING_TONES[rating] || "none"}`}>{rating}</span>;
}

function FollowUpCell({ follow }) {
  if (!follow.due) return <span className="cp-muted">—</span>;
  return <>{follow.completed}<span className="cp-muted"> / {follow.due}</span></>;
}

export function Leaderboard({ employees, onOpen }) {
  return (
    <section className="cp-card cp-leaderboard">
      <header className="cp-card-head">
        <div>
          <h2>Employee performance leaderboard</h2>
        </div>
      </header>
      <div className="cp-table-scroll">
        <table className="cp-table">
          <thead>
            <tr>
              <th scope="col" className="cp-rank-col">Rank</th>
              <th scope="col">Employee</th>
              <th scope="col" className="num">Leads</th>
              <th scope="col" className="num">Contacted</th>
              <th scope="col" className="num">Follow-ups done</th>
              <th scope="col" className="num">Conversions</th>
              <th scope="col" className="num">Conv. rate</th>
              <th scope="col" className="num">Revenue</th>
              <th scope="col" className="num">Overdue now</th>
              <th scope="col">Performance</th>
            </tr>
          </thead>
          <tbody>
            {employees.length === 0 ? (
              <tr><td colSpan={10} className="cp-empty">No CRM employees match these filters.</td></tr>
            ) : employees.map((row) => (
              <tr key={row.name} className={row.rank === 1 ? "cp-row-top" : ""} onClick={() => onOpen(row.name)}>
                <td className="cp-rank-col">
                  {row.rank === 1 ? <span className="cp-rank cp-rank-top"><Trophy size={13} aria-label="Top performer" />1</span> : <span className="cp-rank">{row.rank ?? "—"}</span>}
                </td>
                <td>
                  <button type="button" className="cp-person" onClick={(event) => { event.stopPropagation(); onOpen(row.name); }}>
                    <strong>{row.name}</strong>
                    <span>{row.role}</span>
                  </button>
                </td>
                <td className="num">{row.leads}</td>
                <td className="num">{row.contacted}</td>
                <td className="num"><FollowUpCell follow={row.follow} /></td>
                <td className="num strong">{row.conversions}</td>
                <td className="num">{row.leads ? formatRate(row.conversionRate) : "—"}</td>
                <td className="num strong">{formatCurrency(row.revenue)}</td>
                <td className={`num ${row.overdueNow ? "cp-late" : ""}`}>{row.overdueNow}</td>
                <td><RatingBadge rating={row.rating} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function FollowUpTable({ employees }) {
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [selectedMetric, setSelectedMetric] = useState(null);
  const metricMatches = (row) => {
    if (selectedMetric === "due") return row.follow.due > 0;
    if (selectedMetric === "completed") return row.follow.completed > 0;
    if (selectedMetric === "missed") return row.follow.overdue > 0;
    if (selectedMetric === "completion") return row.follow.due > 0;
    return true;
  };
  const visibleEmployees = employees
    .filter((row) => !selectedEmployee || row.name === selectedEmployee)
    .filter(metricMatches);
  const totals = visibleEmployees.reduce((sum, row) => ({
    due: sum.due + row.follow.due,
    completed: sum.completed + row.follow.completed,
    overdue: sum.overdue + row.follow.overdue,
  }), { due: 0, completed: 0, overdue: 0 });
  return (
    <section className={`cp-card cp-follow${selectedEmployee || selectedMetric ? " is-filtered" : ""}`}>
      <header className="cp-card-head">
        <div>
          <h2>Follow-up discipline</h2>
        </div>
      </header>
      <div className="cp-mini-stats">
        <MiniStat label="Follow-ups due" value={totals.due} selected={selectedMetric === "due"} onClick={() => setSelectedMetric((current) => current === "due" ? null : "due")} />
        <MiniStat label="Completed" value={totals.completed} selected={selectedMetric === "completed"} onClick={() => setSelectedMetric((current) => current === "completed" ? null : "completed")} />
        <MiniStat label="Missed" value={totals.overdue} tone={totals.overdue ? "late" : ""} selected={selectedMetric === "missed"} onClick={() => setSelectedMetric((current) => current === "missed" ? null : "missed")} />
        <MiniStat label="Completion rate" value={totals.due ? formatRate(ratio(totals.completed, totals.due)) : "—"} selected={selectedMetric === "completion"} onClick={() => setSelectedMetric((current) => current === "completion" ? null : "completion")} />
      </div>
      <div className="cp-table-scroll">
        <table className="cp-table cp-table-compact">
          <thead>
            <tr>
              <th scope="col">Employee</th>
              <th scope="col" className="num">Due</th>
              <th scope="col" className="num">Completed</th>
              <th scope="col" className="num">Missed</th>
              <th scope="col">Completion</th>
              <th scope="col" className="num">Overdue now</th>
            </tr>
          </thead>
          <tbody>
            {visibleEmployees.length === 0 ? (
              <tr><td colSpan={6} className="cp-empty">No employees available.</td></tr>
            ) : visibleEmployees.map((row) => (
              <tr
                key={row.name}
                className={selectedEmployee === row.name ? "cp-follow-selected" : ""}
                tabIndex={0}
                role="button"
                aria-pressed={selectedEmployee === row.name}
                onClick={() => setSelectedEmployee((current) => current === row.name ? null : row.name)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setSelectedEmployee((current) => current === row.name ? null : row.name);
                  }
                }}
              >
                <td><span className="cp-link">{row.name}</span></td>
                <td className="num">{row.follow.due}</td>
                <td className="num">{row.follow.completed}</td>
                <td className={`num ${row.follow.overdue ? "cp-late" : ""}`}>{row.follow.overdue}</td>
                <td><Meter value={row.follow.completionRate} /></td>
                <td className={`num ${row.overdueNow ? "cp-late" : ""}`}>{row.overdueNow}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function MiniStat({ label, value, tone = "", selected = false, onClick }) {
  return (
    <button type="button" className={`cp-mini${tone ? ` ${tone}` : ""}${selected ? " is-selected" : ""}`} aria-pressed={selected} onClick={onClick}>
      <span>{label}</span>
      <strong>{value}</strong>
    </button>
  );
}

function Meter({ value }) {
  if (value === null || value === undefined) return <span className="cp-muted">—</span>;
  return (
    <span className="cp-meter">
      <span className="cp-meter-track" aria-hidden="true"><span style={{ width: `${Math.round(value * 100)}%` }} /></span>
      <span className="cp-meter-value">{formatRate(value)}</span>
    </span>
  );
}

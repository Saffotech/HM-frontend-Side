import { Trophy } from "lucide-react";
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

export function FollowUpTable({ employees, onOpen }) {
  const totals = employees.reduce((sum, row) => ({
    due: sum.due + row.follow.due,
    completed: sum.completed + row.follow.completed,
    overdue: sum.overdue + row.follow.overdue,
  }), { due: 0, completed: 0, overdue: 0 });
  return (
    <section className="cp-card cp-follow">
      <header className="cp-card-head">
        <div>
          <h2>Follow-up discipline</h2>
          <p>Follow-ups that fell due in this period, and whether the employee acted on them.</p>
        </div>
      </header>
      <div className="cp-mini-stats">
        <MiniStat label="Follow-ups due" value={totals.due} />
        <MiniStat label="Completed" value={totals.completed} />
        <MiniStat label="Missed" value={totals.overdue} tone={totals.overdue ? "late" : ""} />
        <MiniStat label="Completion rate" value={totals.due ? formatRate(ratio(totals.completed, totals.due)) : "—"} />
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
            {employees.map((row) => (
              <tr key={row.name} onClick={() => onOpen(row.name)}>
                <td><button type="button" className="cp-link" onClick={(event) => { event.stopPropagation(); onOpen(row.name); }}>{row.name}</button></td>
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

export function MiniStat({ label, value, tone = "" }) {
  return (
    <div className={`cp-mini ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
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

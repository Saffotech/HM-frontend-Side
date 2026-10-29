import Modal from "../../../../../shared/components/Modal";
import Pagination from "../../../../../shared/components/Pagination";
import { LIST_PAGE_SIZE, usePagination } from "../../../../../shared/hooks/usePagination";
import { formatCurrency } from "../../../../../shared/utils/formatCurrency";
import { formatDate } from "../../../../../shared/utils/formatDate";
import { SCORE_WEIGHTS, formatRate } from "./metrics";
import { formatRange, inRange } from "../../../../../shared/utils/periods";
import { EmployeeTrend } from "./PerformanceCharts";
import { RatingBadge } from "./PerformanceTables";

const PART_LABELS = {
  conversionRate: "Conversion rate",
  revenue: "Revenue",
  conversions: "Conversions",
  contactRate: "Contact rate",
  followUpCompletion: "Follow-up completion",
  leadVolume: "Lead volume",
};
const STATUS_TONES = { New: "new", Contacted: "contacted", Registered: "registered", "Not Interested": "closed" };

export default function EmployeeDetail({ row, ranked, leads, trend, period, today, onClose, listKey = "" }) {
  const pagination = usePagination(leads, LIST_PAGE_SIZE, `${row?.name || ""}|${listKey}`);
  if (!row) return null;
  const recent = pagination.rows;
  return (
    <Modal open title={row.name} subtitle={`${row.role} · ${formatRange(period)}`} onClose={onClose} size="xl">
      <div className="cp-detail">
        <div className="cp-detail-status">
          <RatingBadge rating={row.rating} />
          {row.score !== null && <span><strong>{row.score}</strong> / 100 score</span>}
          {row.rank && <span>Rank {row.rank} of {ranked}</span>}
          {row.previous?.score != null && row.score !== null && (
            <span className="cp-muted">Previous period: {row.previous.score}</span>
          )}
        </div>

        <div className="cp-detail-stats">
          <Stat label="Leads assigned" value={row.leads} detail={row.selfSourced ? `${row.selfSourced} self-sourced` : ""} />
          <Stat label="Leads contacted" value={row.contacted} detail={row.leads ? `${formatRate(row.contacted / row.leads)} of leads` : ""} />
          <Stat label="Follow-ups completed" value={row.follow.due ? `${row.follow.completed} / ${row.follow.due}` : "—"} detail={row.follow.due ? `${formatRate(row.follow.completionRate)} completion` : "None due"} />
          <Stat label="Conversions" value={row.conversions} />
          <Stat label="Conversion rate" value={row.leads ? formatRate(row.conversionRate) : "—"} />
          <Stat label="Revenue generated" value={formatCurrency(row.revenue)} />
          <Stat label="Avg revenue / conversion" value={row.conversions ? formatCurrency(row.avgRevenue) : "—"} />
          <Stat label="Overdue follow-ups" value={row.overdueNow} tone={row.overdueNow ? "late" : ""} detail="As of today" />
        </div>

        {row.attention.length > 0 && (
          <div className="cp-detail-attention">
            <strong>Needs attention</strong>
            <ul>{row.attention.map((reason) => <li key={reason}>{reason}</li>)}</ul>
          </div>
        )}

        <div className="cp-detail-grid">
          <section>
            <h3>Leads and conversions, last 6 months</h3>
            <EmployeeTrend trend={trend} name={row.name} />
          </section>
          <section>
            <h3>Score breakdown</h3>
            {row.parts ? (
              <ul className="cp-breakdown">
                {Object.entries(SCORE_WEIGHTS).map(([key, weight]) => (
                  <li key={key}>
                    <span>{PART_LABELS[key]}</span>
                    <span className="cp-breakdown-bar" aria-hidden="true"><span style={{ width: `${Math.round(row.parts[key] * 100)}%` }} /></span>
                    <strong>{(weight * row.parts[key]).toFixed(1)}<small> / {weight}</small></strong>
                  </li>
                ))}
                {row.penalty > 0 && (
                  <li className="cp-breakdown-penalty">
                    <span>Overdue follow-ups</span>
                    <span />
                    <strong>−{row.penalty}</strong>
                  </li>
                )}
              </ul>
            ) : (
              <p className="cp-muted">No leads were received in this period, so there is no score.</p>
            )}
          </section>
        </div>

        <section>
          <h3>Recent leads handled</h3>
          <div className="cp-table-scroll">
            <table className="cp-table cp-table-compact">
              <thead>
                <tr>
                  <th scope="col">Hospital</th>
                  <th scope="col">Lead source</th>
                  <th scope="col">Plan</th>
                  <th scope="col">Lead date</th>
                  <th scope="col">Last contact</th>
                  <th scope="col">Next follow-up</th>
                  <th scope="col">Status</th>
                  <th scope="col" className="num">Revenue</th>
                  <th scope="col">Activity</th>
                </tr>
              </thead>
              <tbody>
                {recent.length === 0 ? (
                  <tr><td colSpan={9} className="cp-empty">No leads match the current filters.</td></tr>
                ) : recent.map((lead) => (
                  <tr key={lead.id} className={inRange(lead.day, period) ? "" : "cp-row-dim"}>
                    <td><strong className="cp-name">{lead.hospitalName}</strong><span className="cp-sub">{lead.id}{lead.hospitalId ? ` · ${lead.hospitalId}` : ""}</span></td>
                    <td>{lead.source}</td>
                    <td>{lead.plan}</td>
                    <td className="cp-nowrap">{formatDate(lead.day)}</td>
                    <td className="cp-nowrap">{lead.lastContactAt ? formatDate(lead.lastContactAt) : <span className="cp-muted">Not contacted</span>}</td>
                    <td className={lead.overdueNow ? "cp-late" : ""}>
                      {lead.nextFollowUp ? `${formatDate(lead.nextFollowUp)}${lead.overdueNow ? " · Overdue" : lead.nextFollowUp === today ? " · Today" : ""}` : <span className="cp-muted">—</span>}
                    </td>
                    <td><span className={`onb-chip onb-chip-${STATUS_TONES[lead.status] || "new"}`}>{lead.status}</span></td>
                    <td className="num">
                      {lead.registered ? formatCurrency(lead.revenue) : <span className="cp-muted">—</span>}
                      {lead.registered && !lead.revenue && <span className="cp-sub">{lead.subscriptionStatus === "Trial" ? "On trial" : "No paid invoice yet"}</span>}
                    </td>
                    <td><span className="cp-name">{lead.activityCount} logged</span><span className="cp-sub">{lead.lastActivity || "No activity"}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination {...pagination} onPageChange={pagination.setPage} />
          <p className="cp-card-note">
            {leads.length} {leads.length === 1 ? "lead" : "leads"}, most recent first. Leads received outside the selected period are dimmed.
          </p>
        </section>
      </div>
    </Modal>
  );
}

function Stat({ label, value, detail, tone = "" }) {
  return (
    <div className={`cp-detail-stat ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      {detail && <small>{detail}</small>}
    </div>
  );
}

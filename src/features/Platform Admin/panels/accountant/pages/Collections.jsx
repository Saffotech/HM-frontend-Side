import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AlertCircle, Banknote, CheckCircle2 } from "lucide-react";
import Pagination from "../../../shared/components/Pagination";
import RecordPaymentDialog from "../../../shared/components/RecordPaymentDialog";
import Button from "../../../shared/components/Button";
import { LIST_PAGE_SIZE, usePagination } from "../../../shared/hooks/usePagination";
import { matchesInvoiceFilters, monthlyCollectionComparison, recentPaidInvoices } from "../../../shared/api/invoiceModel";
import { usePlatformInvoices } from "../../../shared/hooks/usePlatformInvoices";
import { accountsPath } from "../../../shared/paths";
import { daysUntil, formatDate, todayInput } from "../../../shared/utils/formatDate";
import { formatCompactCurrency, formatCurrency, formatPercent } from "../../../shared/utils/formatCurrency";
import { compareCollections, isUnpaid } from "../../../shared/utils/invoices";
import "../Accountant.css";

const PREVIOUS_BAR = "#4778dc";
const CURRENT_BAR = "#13877f";

const CARDS = [
  { key: "today", label: "Due today", tone: "accounts-stat-today" },
  { key: "overdue", label: "Overdue", tone: "accounts-stat-overdue" },
  { key: "pending", label: "Pending", tone: "accounts-stat-pending" },
  { key: "collected", label: "Collected", tone: "accounts-stat-collected" },
];

const STATUS_TONE = {
  Paid: "paid",
  Pending: "pending",
  Overdue: "overdue",
  Failed: "failed",
};

function StatusBadge({ status }) {
  if (!status) return <span className="accounts-muted">—</span>;
  const tone = STATUS_TONE[status] || "pending";
  return <span className={`accounts-chip accounts-chip-${tone}`}>{status}</span>;
}

function DueCell({ invoice }) {
  if (!invoice.dueDate) return <span className="accounts-muted">—</span>;
  if (invoice.status === "Paid") return <span>{formatDate(invoice.dueDate)}</span>;
  const days = daysUntil(invoice.dueDate);
  let hint = `in ${days} days`;
  let tone = "";
  if (days < 0) {
    hint = `${Math.abs(days)} days late`;
    tone = "late";
  } else if (days === 0) {
    hint = "due today";
    tone = "soon";
  } else if (days <= 7) {
    tone = "soon";
  }
  return (
    <span className="accounts-due">
      {formatDate(invoice.dueDate)}
      <small className={tone}>{hint}</small>
    </span>
  );
}

function SectionState({ title, detail, action = null }) {
  return (
    <div className="accounts-state">
      <strong>{title}</strong>
      <span>{detail}</span>
      {action}
    </div>
  );
}

function InsightMessage({ title, detail, action = null }) {
  return (
    <div className="accounts-insight__state">
      <SectionState title={title} detail={detail} action={action} />
    </div>
  );
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(() => (
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  ));

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReduced(media.matches);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  return reduced;
}

function activityNote(collected) {
  if (collected.rows.length === 0 && collected.unorderedCount > 0) {
    return "Paid invoices are in this response, but none has a usable payment date, so they cannot be ordered.";
  }
  if (collected.rows.length === 0) return "Paid invoices will list here once a payment is recorded.";
  if (collected.complete) {
    return "Newest paid invoices in this response, by payment date. The date has no time of day, so same-day payments stay in the returned order.";
  }
  return "Some paid invoices have no usable payment date, so they are omitted. Rows that include a payment date are ordered newest first.";
}

function comparisonDetail(comparison) {
  if (comparison.reason === "missing-amount") {
    return "A collected payment is missing an amount, so monthly totals are not shown.";
  }
  if (comparison.reason === "missing-payment-date") {
    return "Paid invoices are in this response, but none has a usable payment date.";
  }
  return "Monthly comparison data is unavailable.";
}

function comparisonSubtitle(comparison) {
  if (!comparison.available) return "Current month against the previous month, by payment date.";
  if (comparison.undatedCount > 0) return "By payment date. Payments without a usable date are excluded.";
  return `${comparison.previousLabel} compared with ${comparison.currentLabel}, by payment date.`;
}

function ChangeBadge({ change, current, previous }) {
  if (change == null) {
    const label = previous === 0 && current === 0 ? "No collections" : "No baseline";
    return (
      <span
        className="accounts-change accounts-change--muted"
        title="Percentage change is not shown because the previous month collected nothing."
      >
        {label}
      </span>
    );
  }
  const tone = change > 0 ? "up" : change < 0 ? "down" : "flat";
  const direction = change > 0 ? "increased" : change < 0 ? "decreased" : "unchanged";
  return (
    <span className={`accounts-change accounts-change--${tone}`} title={`Collections ${direction} compared with the previous month.`}>
      {formatPercent(change)}
      <span className="accounts-sr-only"> collections {direction} compared with the previous month</span>
    </span>
  );
}

function ActivityRow({ invoice }) {
  const hospital = invoice.hospitalName || "Hospital";
  const number = invoice.number || "—";
  const when = invoice.paidAt ? `Paid ${formatDate(invoice.paidAt)}` : "";
  const actor = invoice.recordedByName ? `Recorded by ${invoice.recordedByName}` : "";
  return (
    <li className="accounts-record">
      <span className="accounts-record__icon accounts-record__icon--success" aria-hidden="true">
        <CheckCircle2 size={16} />
      </span>
      <div className="accounts-record__body">
        <strong className="accounts-record__title" title={hospital}>{hospital}</strong>
        <span className="accounts-record__meta">
          <span className="accounts-invoice" title={number}>{number}</span>
          {when ? <span title={when}>{when}</span> : null}
          {actor ? <span title={actor}>{actor}</span> : null}
        </span>
      </div>
      <span className="accounts-record__amount">{formatCurrency(invoice.paymentAmount ?? invoice.amount)}</span>
    </li>
  );
}

function ComparisonTip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  if (!row) return null;
  return (
    <div className="accounts-chart-tip">
      <strong>{row.series}</strong>
      <span>{row.label}</span>
      <span>{formatCurrency(row.amount)}</span>
    </div>
  );
}

function MonthlyChart({ comparison }) {
  const reducedMotion = usePrefersReducedMotion();
  const bars = [
    { series: "Previous month", label: comparison.previousLabel, amount: comparison.previous, fill: PREVIOUS_BAR },
    { series: "Current month", label: comparison.currentLabel, amount: comparison.current, fill: CURRENT_BAR },
  ];
  const changeText = comparison.change == null
    ? "Percentage change is not shown because the previous month collected nothing."
    : `Change ${formatPercent(comparison.change)}.`;
  const summary = `${comparison.previousLabel}, previous month, ${formatCurrency(comparison.previous)}. ${comparison.currentLabel}, current month, ${formatCurrency(comparison.current)}. ${changeText}`;

  return (
    <div className="accounts-chart">
      <p className="accounts-chart__axis" id="monthly-comparison-axis">Collected (INR)</p>
      <div className="accounts-chart__plot" role="img" aria-label={summary}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={bars}
            margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
            barCategoryGap="32%"
            accessibilityLayer
          >
            <CartesianGrid stroke="#e1e7ef" vertical={false} />
            <XAxis
              dataKey="series"
              tick={{ fill: "#5b6b82", fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              interval={0}
            />
            <YAxis
              width={56}
              tickFormatter={formatCompactCurrency}
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#667895", fontSize: 11 }}
              domain={[0, (dataMax) => (dataMax > 0 ? dataMax * 1.12 : 1)]}
            />
            <Tooltip cursor={{ fill: "rgba(19, 135, 127, 0.08)" }} content={<ComparisonTip />} />
            <Bar dataKey="amount" name="Collected" maxBarSize={56} radius={[6, 6, 0, 0]} isAnimationActive={!reducedMotion}>
              {bars.map((bar) => <Cell key={bar.series} fill={bar.fill} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function ComparisonTotals({ comparison }) {
  return (
    <dl className="accounts-compare-totals">
      <div>
        <dt><i className="is-previous" aria-hidden="true" />Previous · {comparison.previousLabel}</dt>
        <dd>{formatCurrency(comparison.previous)}</dd>
      </div>
      <div>
        <dt><i className="is-current" aria-hidden="true" />Current · {comparison.currentLabel}</dt>
        <dd>{formatCurrency(comparison.current)}</dd>
      </div>
    </dl>
  );
}

export default function Collections() {
  const navigate = useNavigate();
  const today = todayInput();
  const { invoices, loading, error, reload } = usePlatformInvoices();
  const [active, setActive] = useState("");
  const [paying, setPaying] = useState(null);
  const [notice, setNotice] = useState("");

  const counts = useMemo(() => ({
    today: invoices.filter((invoice) => matchesInvoiceFilters(invoice, { status: "today", today })).length,
    overdue: invoices.filter((invoice) => invoice.status === "Overdue").length,
    pending: invoices.filter((invoice) => invoice.status === "Pending").length,
    collected: invoices.filter((invoice) => invoice.status === "Paid").length,
  }), [invoices, today]);

  const queue = useMemo(() => {
    const rows = invoices.filter((invoice) => (active ? matchesInvoiceFilters(invoice, { status: active, today }) : isUnpaid(invoice)));
    return [...rows].sort(compareCollections);
  }, [active, invoices, today]);
  const collected = useMemo(() => recentPaidInvoices(invoices, Number.POSITIVE_INFINITY), [invoices]);
  const comparison = useMemo(() => monthlyCollectionComparison(invoices, today), [invoices, today]);
  const queuePagination = usePagination(queue, LIST_PAGE_SIZE, active);
  const activityCaption = activityNote(collected);
  const monthCaption = comparisonSubtitle(comparison);
  const activityScrollable = collected.rows.length > 5;

  const queueSubtitle = active
    ? `${CARDS.find((card) => card.key === active)?.label} invoices that need payment follow-up.`
    : "";

  const retryButton = (
    <Button variant="secondary" size="sm" onClick={reload}>
      Retry
    </Button>
  );

  return (
    <section className="portal-page accounts-home">
      {error && (
        <div className="accounts-banner accounts-banner--error" role="alert">
          <AlertCircle size={16} aria-hidden="true" />
          <div>
            <strong>Invoices could not be loaded</strong>
            <span>{error}</span>
          </div>
          {retryButton}
        </div>
      )}
      {notice && (
        <div className="accounts-banner accounts-banner--success" role="status">
          <CheckCircle2 size={16} aria-hidden="true" />
          <span>{notice}</span>
        </div>
      )}

      <div className="portal-stats accounts-stats">
        {CARDS.map((card) => (
          <button
            key={card.key}
            type="button"
            className={`card accounts-stat ${card.tone}${active === card.key ? " is-active" : ""}`.trim()}
            onClick={() => setActive((current) => (current === card.key ? "" : card.key))}
            aria-pressed={active === card.key}
          >
            <span>{card.label}</span>
            <strong>{loading || error ? "—" : counts[card.key]}</strong>
            <span className="accounts-count">{loading ? "Loading" : error ? "Unavailable" : `${counts[card.key]} invoices`}</span>
          </button>
        ))}
      </div>

      <section className="card card-pad accounts-panel">
        <div className="portal-head accounts-panel-head">
          <div>
            <h2>Collection Queue</h2>
            {queueSubtitle ? <p>{queueSubtitle}</p> : null}
          </div>
          <Link to={accountsPath("/invoices")} className="accounts-text-btn">
            All invoices
          </Link>
        </div>
        <div className="portal-table-wrap">
          <table className="portal-table accounts-queue">
            <thead>
              <tr>
                <th scope="col">Hospital</th>
                <th scope="col">Invoice ID</th>
                <th scope="col">Due date</th>
                <th scope="col" className="accounts-amount-col">Amount</th>
                <th scope="col">Status</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6}>
                    <SectionState title="Loading invoices" detail="Fetching the collection queue." />
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={6}>
                    <SectionState title="Invoices could not be loaded" detail={error} action={retryButton} />
                  </td>
                </tr>
              ) : queue.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <SectionState title="No invoices in this queue." detail="Nothing on the server matches this view." />
                  </td>
                </tr>
              ) : queuePagination.rows.map((invoice) => {
                const rowTone = invoice.status === "Overdue"
                  ? "is-overdue"
                  : invoice.dueDate === today
                    ? "is-today"
                    : "";
                const billingPath = invoice.tenantId == null ? "" : accountsPath(`/hospitals/${invoice.tenantId}`);
                return (
                  <tr
                    key={invoice.id}
                    className={`${rowTone}${billingPath ? " is-clickable" : ""}`.trim()}
                    onClick={billingPath ? () => navigate(billingPath) : undefined}
                  >
                    <td>
                      {billingPath ? (
                        <Link
                          className="accounts-hospital"
                          to={billingPath}
                          title={invoice.hospitalName || "Hospital"}
                          onClick={(event) => event.stopPropagation()}
                        >
                          {invoice.hospitalName || "Hospital"}
                        </Link>
                      ) : (
                        <span className="accounts-hospital" title={invoice.hospitalName || "Hospital"}>
                          {invoice.hospitalName || "Hospital"}
                        </span>
                      )}
                    </td>
                    <td>
                      <span className="accounts-invoice">{invoice.number || "—"}</span>
                    </td>
                    <td><DueCell invoice={invoice} /></td>
                    <td className="accounts-amount">{formatCurrency(invoice.amount)}</td>
                    <td><StatusBadge status={invoice.status} /></td>
                    <td onClick={(event) => event.stopPropagation()}>
                      {isUnpaid(invoice) ? (
                        <Button
                          variant="primary"
                          size="sm"
                          className="accounts-pay-btn"
                          onClick={() => setPaying(invoice)}
                          disabled={Boolean(paying)}
                        >
                          <Banknote size={14} aria-hidden="true" />
                          Record payment
                        </Button>
                      ) : (
                        <span className="accounts-muted">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!loading && !error ? <Pagination {...queuePagination} onPageChange={queuePagination.setPage} /> : null}
      </section>

      <div className="accounts-insight-grid">
        <section className="card accounts-panel accounts-insight" aria-labelledby="recent-activity-title">
          <div className="accounts-insight__head">
            <div className="accounts-insight__intro">
              <h2 id="recent-activity-title">Recent Activity</h2>
              <p title="Newest paid invoices from this response.">Newest paid invoices from this response.</p>
            </div>
          </div>
          <div className="accounts-insight__body">
            {loading ? (
              <InsightMessage title="Loading invoices" detail="Fetching paid invoices." />
            ) : error ? (
              <InsightMessage title="Invoices could not be loaded" detail={error} action={retryButton} />
            ) : collected.rows.length === 0 && collected.unorderedCount > 0 ? (
              <InsightMessage
                title="Payment dates are missing."
                detail="Paid invoices are in this response, but none has a usable payment date, so they cannot be ordered."
              />
            ) : collected.rows.length === 0 ? (
              <InsightMessage title="Nothing collected yet." detail="Paid invoices will list here." />
            ) : (
              <ul
                className={`accounts-activity-scroll${activityScrollable ? " is-scrollable" : ""}`}
                aria-label="Recent activity"
                tabIndex={activityScrollable ? 0 : undefined}
              >
                {collected.rows.map((invoice, index) => (
                  <ActivityRow key={`${invoice.id}-${index}`} invoice={invoice} />
                ))}
              </ul>
            )}
          </div>
          <footer className="accounts-insight__foot">
            <p className="accounts-note" title={activityCaption}>{activityCaption}</p>
          </footer>
        </section>

        <section className="card accounts-panel accounts-insight" aria-labelledby="monthly-comparison-title">
          <div className="accounts-insight__head">
            <div className="accounts-insight__intro">
              <h2 id="monthly-comparison-title">Monthly Comparison</h2>
              <p title={monthCaption}>{monthCaption}</p>
            </div>
            {!loading && !error && comparison.available ? (
              <ChangeBadge change={comparison.change} current={comparison.current} previous={comparison.previous} />
            ) : null}
          </div>
          <div className="accounts-insight__body">
            {loading ? (
              <InsightMessage title="Loading invoices" detail="Fetching collection totals." />
            ) : error ? (
              <InsightMessage title="Invoices could not be loaded" detail={error} action={retryButton} />
            ) : comparison.available ? (
              <MonthlyChart comparison={comparison} />
            ) : (
              <InsightMessage title="Monthly comparison data is unavailable." detail={comparisonDetail(comparison)} />
            )}
          </div>
          <footer className="accounts-insight__foot">
            {!loading && !error && comparison.available ? (
              <ComparisonTotals comparison={comparison} />
            ) : (
              <p className="accounts-note">Collected amounts use the payment date on paid invoices.</p>
            )}
          </footer>
        </section>
      </div>

      {paying && (
        <RecordPaymentDialog
          invoice={paying}
          onClose={() => setPaying(null)}
          onRecorded={() => {
            setPaying(null);
            setNotice("Payment recorded.");
            reload();
          }}
        />
      )}
    </section>
  );
}

import Button from "../../../../shared/components/Button";
import { usePlatformRevenue } from "../../../../shared/hooks/usePlatformRevenue";
import { formatCurrency } from "../../../../shared/utils/formatCurrency";
import "./InvoicesPayments.css";

export default function InvoicesPayments() {
  const { revenue, loading, error, reload } = usePlatformRevenue();

  const cards = [
    ["Collected", revenue ? formatCurrency(revenue.collectedAmount) : "—", revenue ? `${revenue.collectedCount} paid` : "Paid invoices", "tone-paid"],
    ["Pending", revenue ? formatCurrency(revenue.pendingAmount) : "—", revenue ? `${revenue.pendingCount} not past due` : "Pending", "tone-pending"],
    ["Overdue", revenue ? formatCurrency(revenue.overdueAmount) : "—", revenue ? `${revenue.overdueCount} past due` : "Past due", "tone-overdue"],
    ["Outstanding", revenue ? formatCurrency(revenue.outstandingAmount) : "—", "Pending + overdue", "tone-soon"],
    ["Failed", revenue ? String(revenue.failedCount) : "—", "Counted, not added into the money", "tone-failed"],
  ];

  return (
    <section className="inv-page">
      <header className="page-header">
        <h1>Billing & Revenue</h1>
        <Button variant="secondary" onClick={reload} disabled={loading}>{loading ? "Loading…" : "Refresh"}</Button>
      </header>
      <p className="panel-copy" style={{ marginTop: -6, marginBottom: 14 }}>
        Company-wide subscription invoices. Failed invoices are counted and are not added into the amounts. Invoice lines and payments stay in the accountant portal.
      </p>
      {error && (
        <div role="alert">
          <p className="panel-copy">{error}</p>
          <Button variant="secondary" onClick={reload}>Try again</Button>
        </div>
      )}

      <div className="inv-summary">
        {cards.map(([label, value, detail, tone]) => (
          <div key={label} className="inv-summary-item">
            <span>{label}</span>
            <strong className={tone}>{loading && !revenue ? "…" : value}</strong>
            <small>{detail}</small>
          </div>
        ))}
      </div>

      <section className="inv-panel">
        <div className="inv-meta">
          <span>{loading && !revenue ? "Loading invoices" : `${revenue?.invoiceCount ?? 0} invoices`}</span>
          <span>Collected {revenue ? formatCurrency(revenue.collectedAmount) : "—"}</span>
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Status</th>
                <th>Count</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              {revenue ? (
                <>
                  <tr><td>Collected</td><td>{revenue.collectedCount}</td><td>{formatCurrency(revenue.collectedAmount)}</td></tr>
                  <tr><td>Pending</td><td>{revenue.pendingCount}</td><td>{formatCurrency(revenue.pendingAmount)}</td></tr>
                  <tr><td>Overdue</td><td>{revenue.overdueCount}</td><td>{formatCurrency(revenue.overdueAmount)}</td></tr>
                  <tr><td>Outstanding</td><td>—</td><td>{formatCurrency(revenue.outstandingAmount)}</td></tr>
                  <tr><td>Failed</td><td>{revenue.failedCount}</td><td>Not included</td></tr>
                </>
              ) : (
                <tr>
                  <td colSpan={3}>
                    <p className="panel-copy" style={{ margin: "8px 0" }}>{loading ? "Loading revenue." : error || "No revenue totals yet."}</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
}

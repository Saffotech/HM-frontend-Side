import { useState } from "react";
import Button from "../../../../shared/components/Button";
import SearchBar from "../../../../shared/components/SearchBar";
import Select from "../../../../shared/components/Select";
import "./InvoicesPayments.css";

const SUMMARY = [
  ["collected", "Collected", "tone-paid"],
  ["pending", "Pending", "tone-pending"],
  ["overdue", "Overdue", "tone-overdue"],
  ["failed", "Failed", "tone-failed"],
  ["soon", "Due soon", "tone-soon"],
];

export default function InvoicesPayments() {
  const [status, setStatus] = useState("");
  const [period, setPeriod] = useState("");
  const [query, setQuery] = useState("");

  return (
    <section className="inv-page">
      <header className="page-header">
        <h1>Billing & Revenue</h1>
        <Button disabled title="There is no invoice API, so a payment cannot be recorded.">Record payment</Button>
      </header>
      <p className="panel-copy" style={{ marginTop: -6, marginBottom: 14 }}>
        Invoice totals stay blank until a billing API is connected. Nothing on this page is estimated.
      </p>

      <div className="inv-summary">
        {SUMMARY.map(([key, label, tone]) => (
          <button
            key={key}
            type="button"
            className={`inv-summary-item${status === key ? " selected" : ""}`}
            onClick={() => setStatus((current) => (current === key ? "" : key))}
          >
            <span>{label}</span>
            <strong className={tone}>—</strong>
            <small>No invoices</small>
          </button>
        ))}
      </div>

      <section className="inv-panel">
        <div className="inv-toolbar">
          <SearchBar value={query} onChange={setQuery} placeholder="Search invoice or hospital" />
          <Select label="Status" value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="">All statuses</option>
            {SUMMARY.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
          </Select>
          <Select label="Period" value={period} onChange={(event) => setPeriod(event.target.value)}>
            <option value="">All dates</option>
            <option value="month">This month</option>
            <option value="quarter">This quarter</option>
          </Select>
          <Button variant="secondary" onClick={() => { setStatus(""); setPeriod(""); setQuery(""); }}>Reset</Button>
        </div>
        <div className="inv-meta">
          <span>0 invoices</span>
          <span>Collected —</span>
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Invoice</th>
                <th>Hospital</th>
                <th>Issued</th>
                <th>Due</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={7}>
                  <p className="panel-copy" style={{ margin: "8px 0" }}>No invoices yet. Recording a payment needs a billing API.</p>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
}

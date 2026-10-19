import { useState } from "react";
import Button from "../../../shared/components/Button";
import SearchBar from "../../../shared/components/SearchBar";
import Select from "../../../shared/components/Select";
import "../Accountant.css";
import "./InvoicesPayments.css";

const STATUSES = ["Pending", "Overdue", "Paid", "Failed"];

export default function InvoicesPayments() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [period, setPeriod] = useState("");

  return (
    <section className="inv-page">
      <p className="accounts-note" style={{ marginBottom: 14 }}>
        Invoice totals stay blank until a billing API is connected. Nothing on this page is estimated.
      </p>
      <section className="inv-panel">
        <div className="inv-toolbar">
          <SearchBar value={query} onChange={setQuery} placeholder="Search invoice or hospital" />
          <Select label="Status" value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="">All statuses</option>
            {STATUSES.map((item) => <option key={item} value={item}>{item}</option>)}
          </Select>
          <Select label="Period" value={period} onChange={(event) => setPeriod(event.target.value)}>
            <option value="">All dates</option>
            <option value="month">This month</option>
            <option value="quarter">This quarter</option>
          </Select>
          <Button variant="secondary" onClick={() => { setQuery(""); setStatus(""); setPeriod(""); }}>Reset</Button>
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
                  <p className="accounts-note" style={{ margin: "8px 0" }}>
                    No invoices yet. Recording a payment needs a billing API.
                  </p>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
}

import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import RecordPaymentDialog from "../../../shared/components/RecordPaymentDialog";
import PlatformInvoiceTable from "../../../shared/components/PlatformInvoiceTable";
import SearchBar from "../../../shared/components/SearchBar";
import Select from "../../../shared/components/Select";
import Button from "../../../shared/components/Button";
import { matchesInvoiceFilters } from "../../../shared/api/invoiceModel";
import { usePlatformInvoices } from "../../../shared/hooks/usePlatformInvoices";
import { accountsPath } from "../../../shared/paths";
import { todayInput } from "../../../shared/utils/formatDate";
import { formatCurrency } from "../../../shared/utils/formatCurrency";
import "./InvoicesPayments.css";

const STATUSES = [
  ["", "All statuses"],
  ["Pending", "Pending"],
  ["Overdue", "Overdue"],
  ["Paid", "Paid"],
  ["Failed", "Failed"],
  ["soon", "Due soon"],
];

export default function InvoicesPayments() {
  const today = todayInput();
  const { invoices, loading, error, reload } = usePlatformInvoices();
  const [status, setStatus] = useState("");
  const [period, setPeriod] = useState("");
  const [query, setQuery] = useState("");
  const [paying, setPaying] = useState(null);
  const [notice, setNotice] = useState("");

  const visible = useMemo(
    () => invoices.filter((invoice) => matchesInvoiceFilters(invoice, { query, status, period, today })),
    [invoices, period, query, status, today],
  );
  const collected = visible
    .filter((invoice) => invoice.status === "Paid")
    .reduce((sum, invoice) => sum + Number(invoice.paymentAmount ?? invoice.amount) || 0, 0);

  return (
    <section className="inv-page">
      <p className="panel-copy">
        Invoices come from the platform billing API. Quarter is filtered in this list. The server due filter only accepts all, today, and this month.
      </p>
      {notice && <p className="panel-copy" role="status">{notice}</p>}
      <section className="inv-panel">
        <div className="inv-toolbar">
          <SearchBar value={query} onChange={setQuery} placeholder="Search invoice or hospital" />
          <Select label="Status" value={status} onChange={(event) => setStatus(event.target.value)}>
            {STATUSES.map(([value, label]) => <option key={value || "all"} value={value}>{label}</option>)}
          </Select>
          <Select label="Period" value={period} onChange={(event) => setPeriod(event.target.value)}>
            <option value="">All dates</option>
            <option value="month">This month</option>
            <option value="quarter">This quarter</option>
          </Select>
          <Button variant="secondary" onClick={() => { setStatus(""); setPeriod(""); setQuery(""); }}>Reset</Button>
        </div>
        <div className="inv-meta">
          <span>{loading ? "Loading invoices" : error ? "Invoices unavailable" : `${visible.length} invoices`}</span>
          <span>{error ? "Collected —" : `Collected ${formatCurrency(collected)}`}</span>
        </div>
        <PlatformInvoiceTable
          invoices={visible}
          loading={loading}
          error={error}
          onPay={setPaying}
          hospitalLink={(invoice) => (
            <Link to={accountsPath(`/hospitals/${invoice.tenantId}`)}>{invoice.hospitalName || "Hospital"}</Link>
          )}
        />
      </section>
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

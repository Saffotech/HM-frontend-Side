import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Pagination from "../../../shared/components/Pagination";
import PlatformInvoiceTable from "../../../shared/components/PlatformInvoiceTable";
import { LIST_PAGE_SIZE, usePagination } from "../../../shared/hooks/usePagination";
import SearchBar from "../../../shared/components/SearchBar";
import Select from "../../../shared/components/Select";
import Button from "../../../shared/components/Button";
import { matchesInvoiceFilters, sumPaidAmounts } from "../../../shared/api/invoiceModel";
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
  const { invoices, loading, error } = usePlatformInvoices();
  const [status, setStatus] = useState("");
  const [period, setPeriod] = useState("");
  const [query, setQuery] = useState("");

  const visible = useMemo(
    () => invoices.filter((invoice) => matchesInvoiceFilters(invoice, { query, status, period, today })),
    [invoices, period, query, status, today],
  );
  const pagination = usePagination(visible, LIST_PAGE_SIZE, `${query}|${status}|${period}`);
  const collected = useMemo(() => sumPaidAmounts(visible), [visible]);

  return (
    <section className="inv-page">
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
          <span>{loading ? "Loading invoices" : error ? "Invoices unavailable" : `${visible.length} invoices in this list`}</span>
          <span>{loading || error || !collected.complete ? "Collected —" : `Collected in this list ${formatCurrency(collected.amount)}`}</span>
        </div>
        {!loading && !error && !collected.complete && (
          <p className="panel-copy">A collected total is not shown because a paid invoice in this list has no usable amount.</p>
        )}
        <PlatformInvoiceTable
          invoices={loading || error ? visible : pagination.rows}
          loading={loading}
          error={error}
          viewPath={(invoice) => (invoice.tenantId == null ? "" : accountsPath(`/hospitals/${invoice.tenantId}`))}
          hospitalLink={(invoice) => (
            invoice.tenantId == null
              ? (invoice.hospitalName || "Hospital")
              : <Link to={accountsPath(`/hospitals/${invoice.tenantId}`)} onClick={(event) => event.stopPropagation()}>{invoice.hospitalName || "Hospital"}</Link>
          )}
        />
        {!loading && !error ? <Pagination {...pagination} onPageChange={pagination.setPage} /> : null}
      </section>
    </section>
  );
}

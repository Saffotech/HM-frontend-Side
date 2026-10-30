import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import InvoicePrintSheets from "../../../shared/components/InvoicePrintSheets";
import Pagination from "../../../shared/components/Pagination";
import PlatformInvoiceTable from "../../../shared/components/PlatformInvoiceTable";
import { LIST_PAGE_SIZE, usePagination } from "../../../shared/hooks/usePagination";
import RecordPaymentDialog from "../../../shared/components/RecordPaymentDialog";
import SearchBar from "../../../shared/components/SearchBar";
import Select from "../../../shared/components/Select";
import Button from "../../../shared/components/Button";
import { displayHospitalName, matchesInvoiceFilters, sumPaidAmounts } from "../../../shared/api/invoiceModel";
import { usePlatformInvoices } from "../../../shared/hooks/usePlatformInvoices";
import { accountantBackTitle, isAccountantLocation } from "../../../shared/navigation/inAppHistory";
import { useInAppBack, useInAppPrevious } from "../../../shared/navigation/useInAppHistory";
import { accountsPath } from "../../../shared/paths";
import { todayInput } from "../../../shared/utils/formatDate";
import { formatCurrency } from "../../../shared/utils/formatCurrency";
import { isUnpaid } from "../../../shared/utils/invoices";
import "../Accountant.css";
import "./HospitalBilling.css";
import "./InvoicesPayments.css";

const STATUS_FILTERS = [
  { key: "", label: "All" },
  { key: "Pending", label: "Pending" },
  { key: "Overdue", label: "Overdue" },
  { key: "Paid", label: "Paid" },
  { key: "Failed", label: "Failed" },
  { key: "soon", label: "Due soon" },
];

function sumUnpaidAmounts(invoices) {
  let amount = 0;
  let complete = true;
  (Array.isArray(invoices) ? invoices : []).forEach((invoice) => {
    if (!isUnpaid(invoice)) return;
    const value = Number(invoice?.amount);
    if (!Number.isFinite(value)) {
      complete = false;
      return;
    }
    amount += value;
  });
  return { amount: complete ? amount : null, complete };
}

export default function HospitalBilling() {
  const { id } = useParams();
  const previous = useInAppPrevious(isAccountantLocation);
  const goBack = useInAppBack(accountsPath("/invoices"), isAccountantLocation);
  const backLabel = previous
    ? (accountantBackTitle(previous.pathname) || "Back")
    : "Invoices & Payments";
  const today = todayInput();
  const { invoices, loading, error, reload } = usePlatformInvoices({ tenantId: id, enabled: Boolean(id) });
  const [status, setStatus] = useState("");
  const [period, setPeriod] = useState("");
  const [query, setQuery] = useState("");
  const [paying, setPaying] = useState(null);
  const [notice, setNotice] = useState("");
  const [printJob, setPrintJob] = useState(null);

  useEffect(() => {
    if (!printJob) return undefined;
    const root = document.querySelector(".platform-root");
    root?.classList.add("printing-invoices");
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      root?.classList.remove("printing-invoices");
      window.removeEventListener("afterprint", finish);
      setPrintJob(null);
    };
    window.addEventListener("afterprint", finish);
    const frame = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => window.print());
    });
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("afterprint", finish);
      root?.classList.remove("printing-invoices");
    };
  }, [printJob]);

  const profile = useMemo(() => {
    return [...invoices].sort((left, right) => String(right.invoiceDate || "").localeCompare(String(left.invoiceDate || "")))[0] || null;
  }, [invoices]);
  const visible = useMemo(
    () => invoices.filter((invoice) => matchesInvoiceFilters(invoice, { query, status, period, today })),
    [invoices, period, query, status, today],
  );
  const pagination = usePagination(visible, LIST_PAGE_SIZE, `${id}|${query}|${status}|${period}`);
  const collected = useMemo(() => sumPaidAmounts(invoices), [invoices]);
  const outstanding = useMemo(() => sumUnpaidAmounts(invoices), [invoices]);
  const statusCounts = useMemo(() => {
    const scoped = invoices.filter((invoice) => matchesInvoiceFilters(invoice, { query, period, today }));
    return {
      "": scoped.length,
      Pending: scoped.filter((invoice) => invoice.status === "Pending").length,
      Overdue: scoped.filter((invoice) => invoice.status === "Overdue").length,
      Paid: scoped.filter((invoice) => invoice.status === "Paid").length,
      Failed: scoped.filter((invoice) => invoice.status === "Failed").length,
      soon: scoped.filter((invoice) => matchesInvoiceFilters(invoice, { status: "soon", today })).length,
    };
  }, [invoices, period, query, today]);
  const filtersActive = Boolean(query || status || period);
  const title = loading
    ? "Loading hospital invoices"
    : error
      ? "Hospital invoices"
      : profile
        ? displayHospitalName(profile.hospitalName)
        : "Hospital name unavailable";

  return (
    <section className="inv-page hb-page">
      <button type="button" className="hb-back" onClick={goBack}>
        <ArrowLeft size={14} aria-hidden="true" />
        {backLabel}
      </button>

      <section className="hb-hero">
        <div>
          <h2>{title}</h2>
          <p className="hb-hero-meta">
            {profile?.hospitalCode ? <span className="hb-chip hb-chip-code">{profile.hospitalCode}</span> : null}
            {profile?.plan ? <span className="hb-chip hb-chip-plan">{profile.plan}</span> : null}
            {profile?.billingCycle ? <span className="hb-chip hb-chip-cycle">{profile.billingCycle}</span> : null}
            {!profile?.hospitalCode && !profile?.plan && !profile?.billingCycle ? <span className="hb-chip hb-chip-code">Payment records for this hospital</span> : null}
          </p>
        </div>
        <div className="hb-hero-tags">
          <Button className="no-print" variant="secondary" onClick={() => setPrintJob({ key: Date.now(), invoices })} disabled={loading || Boolean(error) || !invoices.length}>Print all</Button>
        </div>
      </section>

      <div className="hb-money-row">
        <div className="hb-money">
          <span>Collected</span>
          <strong>{loading || error || !collected.complete ? "—" : formatCurrency(collected.amount)}</strong>
        </div>
        <div className="hb-money">
          <span>Outstanding</span>
          <strong>{loading || error || !outstanding.complete ? "—" : formatCurrency(outstanding.amount)}</strong>
        </div>
      </div>
      {!loading && !error && !collected.complete && (
        <p className="hb-note">A collected total is not shown because a paid invoice has no usable amount.</p>
      )}
      {!loading && !error && !outstanding.complete && (
        <p className="hb-note">An outstanding total is not shown because an unpaid invoice has no usable amount.</p>
      )}

      {notice && <p className="panel-copy" role="status">{notice}</p>}
      <section className="inv-panel">
        <div className="hb-status" role="group" aria-label="Filter invoices by status">
          {STATUS_FILTERS.map((item) => {
            const active = status === item.key;
            const count = statusCounts[item.key];
            return (
              <button
                key={item.label}
                type="button"
                className={`hb-status__item${active ? " is-active" : ""}${item.key === "Overdue" && count ? " is-late" : ""}`}
                aria-pressed={active}
                onClick={() => setStatus(item.key)}
              >
                <span>{item.label}</span>
                <strong>{loading || error ? "—" : count}</strong>
              </button>
            );
          })}
        </div>
        <div className="inv-toolbar">
          <SearchBar value={query} onChange={setQuery} placeholder="Search invoice number" />
          <Select label="Period" value={period} onChange={(event) => setPeriod(event.target.value)}>
            <option value="">All dates</option>
            <option value="month">This month</option>
            <option value="quarter">This quarter</option>
          </Select>
          <Button variant="secondary" onClick={() => { setStatus(""); setPeriod(""); setQuery(""); }} disabled={!filtersActive}>Reset</Button>
        </div>
        <PlatformInvoiceTable
          invoices={loading || error ? visible : pagination.rows}
          loading={loading}
          error={error}
          showRecords
          hideHospital
          onPay={setPaying}
          onPrint={(invoice) => setPrintJob({ key: Date.now(), invoices: [invoice] })}
        />
        {!loading && !error ? <Pagination {...pagination} onPageChange={pagination.setPage} /> : null}
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
      {printJob && createPortal(
        <InvoicePrintSheets invoices={printJob.invoices} />,
        document.querySelector(".platform-root") || document.body,
      )}
    </section>
  );
}

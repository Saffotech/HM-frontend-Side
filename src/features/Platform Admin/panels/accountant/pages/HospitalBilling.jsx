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
import { useInAppBack, useInAppPrevious } from "../../../shared/navigation/InAppHistoryTracker";
import { accountsPath } from "../../../shared/paths";
import { todayInput } from "../../../shared/utils/formatDate";
import { formatCurrency } from "../../../shared/utils/formatCurrency";
import "../Accountant.css";
import "./HospitalBilling.css";
import "./InvoicesPayments.css";

const STATUSES = [
  ["", "All statuses"],
  ["Pending", "Pending"],
  ["Overdue", "Overdue"],
  ["Paid", "Paid"],
  ["Failed", "Failed"],
  ["soon", "Due soon"],
];

function tagTone(status) {
  const text = String(status || "").toLowerCase();
  if (text.includes("active")) return "hb-tag-ok";
  if (text.includes("trial")) return "hb-tag-info";
  if (text.includes("overdue") || text.includes("expired") || text.includes("fail")) return "hb-tag-warn";
  return "hb-tag-muted";
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
  const listCollected = useMemo(() => sumPaidAmounts(visible), [visible]);
  const pending = invoices.filter((invoice) => invoice.status === "Pending").length;
  const overdue = invoices.filter((invoice) => invoice.status === "Overdue").length;
  const paidCount = invoices.filter((invoice) => invoice.status === "Paid").length;
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
          <p>
            {profile?.hospitalCode ? <span>{profile.hospitalCode}</span> : null}
            {profile?.plan ? <span>{profile.plan}</span> : null}
            {profile?.billingCycle ? <span>{profile.billingCycle}</span> : null}
            {!profile?.hospitalCode && !profile?.plan && !profile?.billingCycle ? <span>Payment records for this hospital</span> : null}
          </p>
        </div>
        <div className="hb-hero-tags">
          {profile?.subscriptionStatus ? (
            <span className={`hb-tag ${tagTone(profile.subscriptionStatus)}`}>{profile.subscriptionStatus}</span>
          ) : null}
          <Button className="no-print" variant="secondary" onClick={() => setPrintJob({ key: Date.now(), invoices })} disabled={loading || Boolean(error) || !invoices.length}>Print all</Button>
        </div>
      </section>

      <div className="hb-kpis">
        <div className="hb-kpi">
          <span>Collected</span>
          <strong>{loading || error || !collected.complete ? "—" : formatCurrency(collected.amount)}</strong>
          <small className="ok">{loading || error ? "Loading" : `${paidCount} paid`}</small>
        </div>
        <div className="hb-kpi">
          <span>Pending</span>
          <strong>{loading || error ? "—" : pending}</strong>
          <small>{loading || error ? "Loading" : "Waiting for payment"}</small>
        </div>
        <div className="hb-kpi">
          <span>Overdue</span>
          <strong>{loading || error ? "—" : overdue}</strong>
          <small className={overdue ? "late" : ""}>{loading || error ? "Loading" : overdue ? "Needs a follow-up" : "None overdue"}</small>
        </div>
        <div className="hb-kpi">
          <span>Invoices</span>
          <strong>{loading || error ? "—" : invoices.length}</strong>
          <small>{loading || error ? "Loading" : "All records for this hospital"}</small>
        </div>
      </div>

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
          <span>{loading ? "Loading invoices" : error ? "Invoices unavailable" : `${visible.length} invoices in this list`}</span>
          <span>{loading || error || !listCollected.complete ? "Collected —" : `Collected in this list ${formatCurrency(listCollected.amount)}`}</span>
        </div>
        {!loading && !error && !listCollected.complete && (
          <p className="panel-copy">A collected total is not shown because a paid invoice in this list has no usable amount.</p>
        )}
        <PlatformInvoiceTable
          invoices={loading || error ? visible : pagination.rows}
          loading={loading}
          error={error}
          showRecords
          onPay={setPaying}
          onPrint={(invoice) => setPrintJob({ key: Date.now(), invoices: [invoice] })}
          hospitalLink={(invoice) => displayHospitalName(invoice.hospitalName)}
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

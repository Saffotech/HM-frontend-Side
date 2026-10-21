import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import PlatformInvoiceTable from "../../../shared/components/PlatformInvoiceTable";
import RecordPaymentDialog from "../../../shared/components/RecordPaymentDialog";
import { usePlatformInvoices } from "../../../shared/hooks/usePlatformInvoices";
import { accountsPath } from "../../../shared/paths";
import "../Accountant.css";
import "./HospitalBilling.css";
import "./InvoicesPayments.css";

export default function HospitalBilling() {
  const { id } = useParams();
  const { invoices, loading, error, reload } = usePlatformInvoices({ tenantId: id, enabled: Boolean(id) });
  const [paying, setPaying] = useState(null);
  const [notice, setNotice] = useState("");
  const name = invoices.find((invoice) => invoice.hospitalName)?.hospitalName;

  return (
    <section className="inv-page hb-page">
      <Link to={accountsPath("/invoices")} className="hb-back">
        <ArrowLeft size={14} aria-hidden="true" />
        Invoices & Payments
      </Link>
      <h1>{name || (loading ? "Loading hospital invoices" : "Hospital invoices")}</h1>
      <p className="panel-copy">Platform invoices for this hospital. Subscription changes are not available from this page.</p>
      {notice && <p className="panel-copy" role="status">{notice}</p>}
      <PlatformInvoiceTable invoices={invoices} loading={loading} error={error} onPay={setPaying} />
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

import { displayHospitalName } from "../api/invoiceModel";
import { formatDate } from "../utils/formatDate";
import { formatCurrency } from "../utils/formatCurrency";

function money(value) {
  if (value == null || value === "" || !Number.isFinite(Number(value))) return "—";
  return formatCurrency(value);
}

function polar(cx, cy, radius, deg) {
  const angle = (deg * Math.PI) / 180;
  return [cx + radius * Math.cos(angle), cy + radius * Math.sin(angle)];
}

function scallopPath(cx, cy, radius, teeth, depth) {
  let path = "";
  for (let tooth = 0; tooth < teeth; tooth += 1) {
    const start = polar(cx, cy, radius, (360 * tooth) / teeth - 90);
    const peak = polar(cx, cy, radius + depth, (360 * (tooth + 0.5)) / teeth - 90);
    const end = polar(cx, cy, radius, (360 * (tooth + 1)) / teeth - 90);
    path += tooth === 0 ? `M ${start[0].toFixed(2)} ${start[1].toFixed(2)} ` : "";
    path += `Q ${peak[0].toFixed(2)} ${peak[1].toFixed(2)} ${end[0].toFixed(2)} ${end[1].toFixed(2)} `;
  }
  return `${path}Z`;
}

function starPoints(cx, cy, radius) {
  const points = [];
  for (let point = 0; point < 10; point += 1) {
    const size = point % 2 === 0 ? radius : radius * 0.42;
    const [x, y] = polar(cx, cy, size, point * 36 - 90);
    points.push(`${x.toFixed(2)},${y.toFixed(2)}`);
  }
  return points.join(" ");
}

const SEAL_CENTER = 120;
const SEAL_EDGE = scallopPath(SEAL_CENTER, SEAL_CENTER, 90, 32, 14);
const SEAL_NAME_ARC = (() => {
  const [startX, startY] = polar(SEAL_CENTER, SEAL_CENTER, 64, 206);
  const [endX, endY] = polar(SEAL_CENTER, SEAL_CENTER, 64, 334);
  return `M ${startX.toFixed(2)} ${startY.toFixed(2)} A 64 64 0 0 1 ${endX.toFixed(2)} ${endY.toFixed(2)}`;
})();
const SEAL_STARS = [-142, -116, -90, -64, -38, 38, 64, 90, 116, 142].map((deg) => {
  const [x, y] = polar(SEAL_CENTER, SEAL_CENTER, 80, deg);
  return starPoints(x, y, 5.4);
});

function InvoiceSeal({ paid, sealId }) {
  const label = paid ? "PAID" : "UNPAID";
  return (
    <svg
      className={`invoice-stamp ${paid ? "is-paid" : "is-unpaid"}`}
      viewBox="0 0 240 240"
      role="img"
      aria-label={`${label}, SaffoCare`}
    >
      <path className="invoice-stamp__edge" d={SEAL_EDGE} />
      <circle className="invoice-stamp__ring" cx="120" cy="120" r="88" />
      <circle className="invoice-stamp__ring" cx="120" cy="120" r="74" />
      {SEAL_STARS.map((points) => <polygon key={points} points={points} />)}
      <defs>
        <path id={sealId} d={SEAL_NAME_ARC} />
      </defs>
      <text className="invoice-stamp__name">
        <textPath href={`#${sealId}`} startOffset="50%" textAnchor="middle" dy="20">SAFFOCARE</textPath>
      </text>
      <path className="invoice-stamp__arc" d="M 74,104 A 50,22 0 0,1 166,104" />
      <text className="invoice-stamp__status" x="120" y={paid ? 138 : 134} textAnchor="middle">{label}</text>
      <path className="invoice-stamp__arc" d="M 82,152 A 42,16 0 0,0 158,152" />
    </svg>
  );
}

function hasPaymentRecord(invoice) {
  return Boolean(
    invoice?.status === "Paid"
    || invoice?.paidAt
    || invoice?.method
    || invoice?.reference
    || invoice?.notes
    || invoice?.recordedByName
    || (invoice?.paymentAmount != null && invoice.paymentAmount !== ""),
  );
}

export function InvoiceSheet({ invoice }) {
  const paid = invoice.status === "Paid";
  const description = [invoice.plan || "Subscription", invoice.billingCycle].filter(Boolean).join(" · ");
  const total = paid && invoice.paymentAmount != null && invoice.paymentAmount !== ""
    ? invoice.paymentAmount
    : invoice.amount;

  return (
    <article className="invoice-sheet">
      <header className="invoice-top">
        <div>
          <strong className="invoice-brand">SaffoCare</strong>
          <span>Platform subscription invoice</span>
          <span>Accountant portal</span>
        </div>
        <div className="invoice-title">
          <h3>INVOICE</h3>
          <span className="inv-mono">{invoice.number || "—"}</span>
        </div>
      </header>
      <div className="invoice-parties">
        <div>
          <span className="invoice-label">Billed to</span>
          <strong>{displayHospitalName(invoice.hospitalName)}</strong>
          <span>{[invoice.hospitalCode, invoice.plan].filter(Boolean).join(" · ") || "—"}</span>
          {invoice.subscriptionStatus ? <span>Subscription {invoice.subscriptionStatus}</span> : null}
        </div>
        <dl>
          <div><dt>Issued</dt><dd>{formatDate(invoice.invoiceDate)}</dd></div>
          <div><dt>Due</dt><dd>{formatDate(invoice.dueDate)}</dd></div>
          <div><dt>Cycle</dt><dd>{invoice.billingCycle || "—"}</dd></div>
        </dl>
      </div>
      <table className="invoice-lines">
        <thead>
          <tr>
            <th>Description</th>
            <th className="num">Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>{description}</td>
            <td className="num">{money(invoice.amount)}</td>
          </tr>
        </tbody>
        <tfoot>
          <tr>
            <td>Total</td>
            <td className="num">{money(total)}</td>
          </tr>
        </tfoot>
      </table>
      <div className="invoice-log">
        {hasPaymentRecord(invoice) ? (
          <>
            <strong>Payment record</strong>
            <span>Paid {formatDate(invoice.paidAt)}</span>
            <span>
              Method {invoice.method || "—"}
              {invoice.reference ? ` · ${invoice.method === "UPI" ? "UPI ID" : "Reference"} ${invoice.reference}` : ""}
            </span>
            <span>Amount {money(invoice.paymentAmount != null && invoice.paymentAmount !== "" ? invoice.paymentAmount : invoice.amount)}</span>
            <span>Recorded by {invoice.recordedByName || "—"}</span>
            {invoice.notes ? <span>Notes {invoice.notes}</span> : null}
          </>
        ) : (
          <span>No payment has been recorded for this invoice.</span>
        )}
        <span>Computer-generated invoice.</span>
      </div>
      <InvoiceSeal paid={paid} sealId={`saffo-seal-${invoice.id ?? invoice.number ?? "invoice"}`} />
    </article>
  );
}

export default function InvoicePrintSheets({ invoices }) {
  if (!invoices?.length) return null;
  return (
    <div className="invoice-print-stack">
      {invoices.map((invoice) => <InvoiceSheet key={invoice.id} invoice={invoice} />)}
    </div>
  );
}

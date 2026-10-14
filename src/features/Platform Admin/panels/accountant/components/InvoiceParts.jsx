import { daysUntil, formatDate } from "../../../shared/utils/formatDate";

export function StatusChip({ status }) {
  const tone = { Paid: "paid", Pending: "pending", Overdue: "overdue", Failed: "failed" }[status] || "pending";
  return <span className={`inv-chip inv-chip-${tone}`}>{status}</span>;
}

export function InfoBox({ title, className = "", children }) {
  return (
    <section className={`inv-box ${className}`.trim()}>
      <h3>{title}</h3>
      <dl>{children}</dl>
    </section>
  );
}

export function InfoRow({ label, value }) {
  return (
    <div className="inv-row">
      <dt>{label}</dt>
      <dd>{value || "—"}</dd>
    </div>
  );
}

export function DueDate({ invoice }) {
  if (invoice.status === "Paid") return <span>{formatDate(invoice.dueDate)}</span>;
  const days = daysUntil(invoice.dueDate);
  let hint = `in ${days} days`;
  let tone = "";
  if (days < 0) { hint = `${Math.abs(days)} days late`; tone = "late"; }
  else if (days === 0) { hint = "due today"; tone = "soon"; }
  else if (days <= 7) tone = "soon";
  return (
    <span className="inv-due">
      {formatDate(invoice.dueDate)}
      <small className={tone}>{hint}</small>
    </span>
  );
}

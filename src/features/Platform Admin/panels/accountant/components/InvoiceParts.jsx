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

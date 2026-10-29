import "./PageHeader.css";

export default function PageHeader({ actions }) {
  if (!actions) return null;
  return (
    <div className="page-header">
      <div className="page-actions">{actions}</div>
    </div>
  );
}

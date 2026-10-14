import { PRIORITIES } from "../utils/crmLeads";
import "./CrmMarks.css";

export function PriorityMark({ value }) {
  const priority = PRIORITIES.includes(value) ? value : "Medium";
  return <span className={`crm-priority crm-priority-${priority.toLowerCase()}`}>{priority}</span>;
}

export function StatusMark({ status }) {
  const tone = { New: "new", Contacted: "ready", Agreed: "agreed", "Not Interested": "closed", Registered: "converted" }[status] || "muted";
  const label = { Registered: "Converted", "Not Interested": "Not interested" }[status] || status;
  return <span className={`crm-badge crm-badge-${tone}`}>{label}</span>;
}

export function FollowMark({ meta }) {
  if (!meta) return null;
  return (
    <span className={`crm-due crm-due-${meta.tone}`}>
      {meta.label}
      {meta.detail ? <small>{meta.detail}</small> : null}
    </span>
  );
}

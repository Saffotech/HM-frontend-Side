import { CONTACT_METHODS } from "../../../shared/data/catalog";
import { formatDate } from "../../../shared/utils/formatDate";
import { time } from "../../../shared/utils/leadMetrics";
import { daysBetween, localDay } from "../../../shared/utils/periods";
import { plural } from "../utils/crmLeads";

/** Lead received → first contact → agreed (sent to Accounts) → registered by Accounts. */
function handoverSteps(lead, today) {
  const history = [...(lead.activity || [])].sort((a, b) => time(a.at) - time(b.at));
  const firstContact = history.find((entry) => CONTACT_METHODS.includes(entry.method));
  const agreed = Boolean(lead.agreedAt);
  const registered = lead.status === "Registered";
  const waiting = lead.status === "Agreed" ? daysBetween(localDay(lead.agreedAt), today) : 0;
  return [
    { key: "received", label: "Lead received", done: true, at: lead.submittedAt, by: lead.source || "" },
    { key: "contacted", label: "First contact", done: Boolean(firstContact) || agreed || registered, at: firstContact?.at, by: firstContact?.by },
    { key: "agreed", label: "Agreed · sent to Accounts", done: agreed, at: lead.agreedAt, by: lead.agreedBy },
    {
      key: "registered",
      label: "Registered by Accounts",
      done: registered,
      current: lead.status === "Agreed",
      at: lead.registeredAt,
      by: lead.registeredBy,
      pending: lead.status === "Agreed" ? `Waiting ${waiting <= 0 ? "since today" : plural(waiting, "day")}` : "",
    },
  ];
}

export default function HandoverSteps({ lead, today, compact = false }) {
  const steps = handoverSteps(lead, today);
  return (
    <ol className={`crm-steps${compact ? " is-compact" : ""}`} aria-label="Handover progress">
      {steps.map((step) => (
        <li key={step.key} className={step.done ? "is-done" : step.current ? "is-current" : ""}>
          <span className="crm-step-dot" aria-hidden="true" />
          <div>
            <strong>{step.label}</strong>
            {!compact && (
              <small>
                {step.done && step.at ? `${formatDate(step.at)}${step.by ? ` · ${step.by}` : ""}` : step.pending || "Not yet"}
              </small>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}

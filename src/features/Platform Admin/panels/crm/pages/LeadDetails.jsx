import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, CalendarClock, CheckCircle2, Mail, Pencil, Phone, RotateCcw, SearchX, Send, XCircle } from "lucide-react";
import Button from "../../../shared/components/Button";
import { CRM_BASE, crmPath } from "../../../shared/paths";
import { formatDate, formatDateTime } from "../../../shared/utils/formatDate";
import { followUpsFor } from "../../../shared/utils/leadMetrics";
import { FollowMark, PriorityMark, StatusMark } from "../components/CrmMarks";
import HandoverSteps from "../components/HandoverSteps";
import { daysInStage, followMeta, isOpen, lastContact, leadAge, plural } from "../utils/crmLeads";
import { useCrm } from "../workspace/workspace-context";
import "./LeadDetails.css";

const BACK_LABELS = [
  ["/leads/", ""],
  ["/leads", "My Leads"],
  ["/follow-ups", "Follow-ups & Tasks"],
  ["/conversions", "My Conversions"],
  ["/performance", "My Performance"],
];

function backLabel(from) {
  if (!from) return "Back to My Leads";
  const path = from.split("?")[0].replace(/\/$/, "");
  if (path === CRM_BASE) return "Back to My Dashboard";
  const match = BACK_LABELS.find(([suffix]) => path.startsWith(crmPath(suffix)));
  return match?.[1] ? `Back to ${match[1]}` : "Back";
}

export default function LeadDetails() {
  const { leadId } = useParams();
  const { leads, today, actions } = useCrm();
  const navigate = useNavigate();
  const { state } = useLocation();
  const from = state?.from || "";
  const lead = leads.find((item) => item.id === leadId) || null;

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [leadId]);

  const goBack = () => {
    if (from) navigate(-1);
    else navigate(crmPath("/leads"));
  };

  const back = (
    <button type="button" className="crm-back" onClick={goBack}>
      <ArrowLeft size={16} aria-hidden="true" />{backLabel(from)}
    </button>
  );

  if (!lead) {
    return (
      <div className="crm-page crm-lead-page">
        {back}
        <section className="crm-card">
          <div className="crm-empty">
            <SearchX size={26} aria-hidden="true" />
            <strong>Lead not found</strong>
            <span>It may have been reassigned to someone else, or the link is out of date.</span>
            <Link to={crmPath("/leads")}>Go to My Leads</Link>
          </div>
        </section>
      </div>
    );
  }

  return <LeadView lead={lead} today={today} actions={actions} back={back} />;
}

function LeadView({ lead, today, actions, back }) {
  const [note, setNote] = useState("");
  const [noteError, setNoteError] = useState("");

  const open = isOpen(lead);
  const contact = lastContact(lead);
  const followUps = followUpsFor(lead);
  const completed = followUps.filter((item) => item.completedDay).length;
  const history = [...(lead.activity || [])].sort((a, b) => new Date(b.at) - new Date(a.at));
  const createdBy = history.find((entry) => entry.method === "Lead created")?.by;
  const timeline = history.some((entry) => entry.method === "Lead created")
    ? history
    : [...history, { at: lead.submittedAt, by: lead.source || "Onboarding request", method: "Lead received", note: "" }];

  const saveNote = () => {
    if (!note.trim()) {
      setNoteError("Write a note first.");
      return;
    }
    if (actions.note(lead, note.trim())) setNote("");
  };

  return (
    <div className="crm-page crm-lead-page">
      {back}

      <section className="crm-card crm-lead-hero">
        <div className="crm-lead-heading">
          <p className="crm-lead-meta">
            <StatusMark status={lead.status} />
            <PriorityMark value={lead.priority} />
          </p>
          <h2>{lead.hospitalName}</h2>
          <p className="crm-lead-sub">
            {[lead.city, lead.state].filter(Boolean).join(", ") || "Location not set"} · {leadAge(lead.submittedAt, today) || formatDate(lead.submittedAt)}
            {" · "}{plural(daysInStage(lead, today), "day")} in {lead.status === "Not Interested" ? "closed" : lead.status}
          </p>
        </div>
        <div className="crm-lead-actions">
          {open && (
            <>
              <Button size="sm" onClick={() => actions.logContact(lead)}><Phone size={14} aria-hidden="true" />Log contact</Button>
              {lead.followUpDate && (
                <Button size="sm" variant="secondary" onClick={() => actions.logContact(lead, "complete")}><CheckCircle2 size={14} aria-hidden="true" />Complete follow-up</Button>
              )}
              <Button size="sm" variant="secondary" onClick={() => actions.schedule(lead)}>
                <CalendarClock size={14} aria-hidden="true" />{lead.followUpDate ? "Reschedule" : "Schedule follow-up"}
              </Button>
              {lead.status === "Contacted" && (
                <Button size="sm" variant="secondary" onClick={() => actions.agree(lead)}><Send size={14} aria-hidden="true" />Mark as agreed</Button>
              )}
            </>
          )}
          {(open || lead.status === "Agreed") && (
            <>
              <Button size="sm" variant="secondary" onClick={() => actions.edit(lead)}><Pencil size={14} aria-hidden="true" />Edit</Button>
              <Button size="sm" variant="ghost" className="crm-danger-text" onClick={() => actions.close(lead)}><XCircle size={14} aria-hidden="true" />Close lead</Button>
            </>
          )}
          {lead.status === "Not Interested" && (
            <Button size="sm" onClick={() => actions.reopen(lead)}><RotateCcw size={14} aria-hidden="true" />Reopen lead</Button>
          )}
          {lead.status === "Registered" && <p className="crm-lead-readonly">Registered by Accounts. This lead is read-only.</p>}
        </div>
      </section>

      <div className="crm-lead-layout">
        <div className="crm-lead-sections">
          <Section title="Hospital">
            <Fact label="Hospital" value={lead.hospitalName} />
            <Fact label="Type" value={lead.type} />
            <Fact label="City" value={lead.city} />
            <Fact label="State" value={lead.state} />
            <Fact wide label="Hospital email" value={lead.hospitalEmail} />
            {lead.message && <Fact wide label="Requirement" value={lead.message} />}
          </Section>

          <Section title="Contact">
            <Fact label="Contact person" value={lead.contactPerson} />
            <Fact label="Designation" value={lead.designation} />
            <Fact wide label="Phone" value={lead.contactPhone ? <a href={`tel:${lead.contactPhone.replace(/\s/g, "")}`}><Phone size={13} aria-hidden="true" />{lead.contactPhone}</a> : ""} />
            <Fact wide label="Email" value={lead.contactEmail ? <a href={`mailto:${lead.contactEmail}`}><Mail size={13} aria-hidden="true" />{lead.contactEmail}</a> : ""} />
          </Section>

          <Section title="Sales">
            <Fact label="Interested plan" value={lead.plan} />
            <Fact label="Billing cycle" value={lead.billingCycle} />
            <Fact label="Source" value={lead.source} />
            <Fact label="Priority" value={<PriorityMark value={lead.priority} />} />
            <Fact label="Received" value={formatDateTime(lead.submittedAt)} />
            <Fact label="Created by" value={createdBy || "Inbound request"} />
            <Fact label="Owner" value={lead.assignedTo} />
          </Section>

          <Section title="Follow-up">
            {lead.status === "Not Interested" ? (
              <>
                <Fact label="Not interested reason" value={<span className="crm-close-reason"><strong>{lead.closeReason || "No reason recorded"}</strong></span>} />
                <Fact label="Closed" value={formatDateTime(lead.closedAt)} />
              </>
            ) : (
              <>
                <Fact label="Next follow-up" value={open ? <FollowMark meta={followMeta(lead.followUpDate, today)} /> : "—"} />
                <Fact label="Next action" value={open ? lead.nextAction : ""} />
              </>
            )}
            <Fact wide label="Last contact" value={contact ? `${contact.method} · ${formatDateTime(contact.at)}` : "No contact logged yet"} />
            <Fact wide label="Follow-ups completed" value={followUps.length ? `${completed} of ${followUps.length}` : "None scheduled yet"} />
          </Section>

          <Section title="Agreement & registration" wide>
            <div className="crm-lead-wide">
              <HandoverSteps lead={lead} today={today} />
            </div>
            {lead.agreedAt && (
              <>
                <Fact label="Agreed plan" value={`${lead.plan || "—"} · ${lead.billingCycle || "—"}`} />
                <Fact label="Sent to Accounts" value={`${formatDateTime(lead.agreedAt)} · ${lead.agreedBy || "—"}`} />
                <Fact wide label="Handover note" value={lead.handoverNote} />
              </>
            )}
            {lead.status === "Registered" && (
              <>
                <Fact label="Hospital ID" value={lead.hospitalId} />
                <Fact label="Registered" value={`${formatDateTime(lead.registeredAt)} · ${lead.registeredBy || "—"}`} />
              </>
            )}
            {lead.status === "Not Interested" && (
              <>
                <Fact label="Close reason" value={lead.closeReason} />
                <Fact label="Closed" value={`${formatDateTime(lead.closedAt)} · ${lead.closedBy || "—"}`} />
                {lead.closeNote && <Fact wide label="Close note" value={lead.closeNote} />}
              </>
            )}
          </Section>
        </div>

        <section className="crm-lead-section crm-lead-activity">
          <h3>Activity timeline</h3>
          {lead.status !== "Registered" && (
            <div className="crm-note-box">
              <label className="crm-sr" htmlFor="crm-note">Add a note</label>
              <textarea
                id="crm-note"
                rows={3}
                value={note}
                placeholder="Add an internal note…"
                onChange={(event) => { setNote(event.target.value); setNoteError(""); }}
              />
              <div>
                {noteError ? <span className="crm-form-error">{noteError}</span> : <span className="crm-hint">Notes don&apos;t change the lead status.</span>}
                <Button size="sm" variant="secondary" onClick={saveNote}>Add note</Button>
              </div>
            </div>
          )}
          <ol className="crm-timeline">
            {timeline.map((entry, index) => (
              <li key={`${entry.at}-${entry.method}-${index}`} className={`is-${timelineTone(entry.method)}`}>
                <strong>{entry.method}</strong>
                <span>{formatDateTime(entry.at)} · {entry.by || "System"}</span>
                {entry.outcome ? <p className="crm-timeline-tag">Outcome: {entry.outcome}</p> : null}
                {entry.note ? <p>{entry.note}</p> : null}
                {entry.followUpDate ? <p>Next follow-up: {formatDate(`${entry.followUpDate}T00:00:00`)}{entry.nextAction ? ` · ${entry.nextAction}` : ""}</p> : null}
                {entry.statusAfter ? <p>Status → {entry.statusAfter}</p> : null}
              </li>
            ))}
          </ol>
        </section>
      </div>
    </div>
  );
}

function timelineTone(method) {
  if (method === "Agreed" || method === "Registration") return "good";
  if (method === "Closed") return "bad";
  if (method === "Note" || method === "Claimed" || method === "Details updated" || method.startsWith("Follow-up")) return "muted";
  return "contact";
}

function Section({ title, wide = false, children }) {
  return (
    <section className={`crm-lead-section${wide ? " crm-lead-wide" : ""}`}>
      <h3>{title}</h3>
      <dl className="crm-facts-grid">{children}</dl>
    </section>
  );
}

function Fact({ label, value, wide = false }) {
  return (
    <div className={wide ? "crm-lead-wide" : ""}>
      <dt>{label}</dt>
      <dd>{value || "—"}</dd>
    </div>
  );
}

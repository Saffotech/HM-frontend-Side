import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { ArrowLeft, Building2, CalendarCheck2, CalendarClock, CalendarDays, Clock3, Mail, MapPin, Pencil, Phone, RotateCcw, SearchX, Send, UserRound, WalletCards, XCircle } from "lucide-react";
import { getLead, mapLead } from "../../../shared/api/leadApi";
import { shouldEndPlatformSession } from "../../../shared/api/platformErrors";
import { isNumericLeadId } from "../../../shared/api/hospitalRegistration";
import Button from "../../../shared/components/Button";
import { usePlatform } from "../../../shared/context/PlatformContext";
import { isCrmLocation } from "../../../shared/navigation/inAppHistory";
import { useInAppBack, useInAppPrevious } from "../../../shared/navigation/InAppHistoryTracker";
import { CRM_BASE, crmPath } from "../../../shared/paths";
import { formatDate, formatDateTime } from "../../../shared/utils/formatDate";
import { formatPhoneDisplay } from "../../../shared/utils/phoneNumbers";
import { followUpsFor } from "../../../shared/utils/leadMetrics";
import { FollowMark, PriorityMark } from "../components/CrmMarks";
import HandoverSteps from "../components/HandoverSteps";
import { CONTACT_OUTCOMES, OUTCOME_TONE, followMeta, isOpen, lastContact } from "../utils/crmLeads";
import { isAutoCreatedHospitalEmailActivity } from "../utils/autoCreatedEmailActivity";
import { useCrm } from "../workspace/workspace-context";
import "./LeadDetails.css";

const CARD_OUTCOME_LABEL = {
  interested: "Interested",
  callback: "Call back",
  agreed: "Agreed",
  "not-interested": "Not interested",
};

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

function crmFrom(value) {
  const raw = String(value || "");
  const path = raw.split("?")[0].split("#")[0];
  if (!path.startsWith("/") || path.startsWith("//")) return "";
  return isCrmLocation({ pathname: path }) ? raw : "";
}

export default function LeadDetails() {
  const { leadId } = useParams();
  const { records = [], today, actions, reloadLeads } = useCrm();
  const { crmSession, signOutPortal } = usePlatform();
  const { state } = useLocation();
  const previous = useInAppPrevious(isCrmLocation);
  const from = crmFrom(state?.from);
  const goBack = useInAppBack(crmPath("/leads"), isCrmLocation, { historyBack: Boolean(from) });
  const backTarget = previous ? `${previous.pathname}${previous.search}` : from;
  const fromList = records.find((item) => String(item.id) === String(leadId)) || null;
  const [fetched, setFetched] = useState(null);
  const [loading, setLoading] = useState(() => !fromList && isNumericLeadId(leadId));
  const [error, setError] = useState("");

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [leadId]);

  useEffect(() => {
    if (fromList || !isNumericLeadId(leadId)) {
      setFetched(null);
      setLoading(false);
      setError(fromList || isNumericLeadId(leadId) ? "" : "This lead link is not a CRM lead.");
      return undefined;
    }
    let cancelled = false;
    setLoading(true);
    setError("");
    getLead(leadId)
      .then((body) => {
        if (!cancelled) setFetched(mapLead(body, crmSession));
      })
      .catch((err) => {
        if (cancelled) return;
        setFetched(null);
        setError(err?.message || "This lead could not be opened.");
        if (shouldEndPlatformSession(err)) signOutPortal("crm");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [crmSession, fromList, leadId, signOutPortal]);

  const back = (
    <button type="button" className="crm-back" onClick={goBack}>
      <ArrowLeft size={16} aria-hidden="true" />{backLabel(backTarget)}
    </button>
  );

  const lead = fromList || fetched;

  if (loading) {
    return (
      <div className="crm-page crm-lead-page">
        {back}
        <section className="crm-card">
          <div className="crm-empty">
            <strong>Loading this lead</strong>
            <span>Fetching the record from the server.</span>
          </div>
        </section>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="crm-page crm-lead-page">
        {back}
        <section className="crm-card">
          <div className="crm-empty">
            <SearchX size={26} aria-hidden="true" />
            <strong>Lead not found</strong>
            <span>{error || "It may have been reassigned to someone else, or the link is out of date."}</span>
            <Button variant="secondary" onClick={() => reloadLeads?.()}>Retry</Button>
            <Link to={crmPath("/leads")}>Go to My Leads</Link>
          </div>
        </section>
      </div>
    );
  }

  return <LeadView lead={lead} today={today} actions={actions} back={back} userId={crmSession?.userId} />;
}

function LeadView({ lead, today, actions, back, userId }) {
  const [note, setNote] = useState("");
  const [noteError, setNoteError] = useState("");

  const open = isOpen(lead);
  const contact = lastContact(lead);
  const followUps = followUpsFor(lead);
  const completed = followUps.filter((item) => item.completedDay).length;
  const history = [...(lead.activity || [])]
    .filter((entry) => !isAutoCreatedHospitalEmailActivity(lead.id, entry.id, userId))
    .sort((a, b) => new Date(b.at) - new Date(a.at));
  const createdBy = history.find((entry) => entry.method === "Lead created")?.by;
  const timeline = history.some((entry) => entry.method === "Lead created")
    ? history
    : [...history, { at: lead.submittedAt, by: lead.source || "Onboarding request", method: "Lead received", note: "" }];

  const saveNote = async () => {
    if (!note.trim()) {
      setNoteError("Write a note first.");
      return;
    }
    const saved = await actions.note(lead, note.trim());
    if (saved) setNote("");
  };

  return (
    <div className="crm-page crm-lead-page">
      {back}

      <section className="crm-card crm-lead-hero">
        <div className="crm-lead-top">
          <h2>{lead.hospitalName}</h2>
          <div className="crm-lead-actions">
          {open && (
            <>
              {CONTACT_OUTCOMES.map(([value, label]) => (
                <Button
                  key={value}
                  size="sm"
                  variant="secondary"
                  className={OUTCOME_TONE[value]}
                  title={label}
                  onClick={() => actions.logContact(lead, lead.followUpDate ? "complete" : "log", value)}
                >
                  {CARD_OUTCOME_LABEL[value] || label}
                </Button>
              ))}
              <Button size="sm" variant="secondary" className="crm-tone-schedule" onClick={() => actions.schedule(lead)}>
                <CalendarClock size={14} aria-hidden="true" />{lead.followUpDate ? "Reschedule" : "Schedule"}
              </Button>
              {lead.status === "Contacted" && (
                <Button size="sm" variant="secondary" className="crm-tone-agreed" onClick={() => actions.agree(lead)}><Send size={14} aria-hidden="true" />Mark as agreed</Button>
              )}
            </>
          )}
          {(open || lead.status === "Agreed") && (
            <Button size="sm" variant="secondary" className="crm-tone-edit" onClick={() => actions.edit(lead)}><Pencil size={14} aria-hidden="true" />Edit</Button>
          )}
          {!open && lead.status === "Agreed" && (
            <Button size="sm" variant="secondary" className="crm-tone-close" onClick={() => actions.close(lead)}><XCircle size={14} aria-hidden="true" />Close lead</Button>
          )}
          {lead.status === "Not Interested" && (
            <Button size="sm" className="crm-tone-reopen" onClick={() => actions.reopen(lead)}><RotateCcw size={14} aria-hidden="true" />Reopen lead</Button>
          )}
          {lead.status === "Registered" && <p className="crm-lead-readonly">Registered by Accounts. This lead is read-only.</p>}
          </div>
        </div>
        <div className="crm-lead-metadata" aria-label="Lead summary">
          <div className="crm-lead-metadata-item">
            <MapPin size={16} aria-hidden="true" />
            <span><strong>{lead.city || "—"}</strong><small>City</small></span>
          </div>
          <div className="crm-lead-metadata-item">
            <CalendarDays size={16} aria-hidden="true" />
            <span><strong>{formatDateTime(lead.submittedAt)}</strong><small>Created</small></span>
          </div>
        </div>
      </section>

      <div className="crm-lead-layout">
        <Section title="Hospital Details" icon={Building2} className="crm-lead-hospital">
          <Fact label="Hospital" value={lead.hospitalName} />
          <Fact label="Type" value={lead.type} />
          <Fact label="City" value={lead.city} />
          <Fact label="State" value={lead.state} />
          {lead.message && <Fact wide label="Requirement" value={lead.message} />}
        </Section>

        <Section title="Contact Details" icon={UserRound} className="crm-lead-contact">
          <Fact label="Contact person" value={lead.contactPerson} />
          <Fact label="Designation" value={lead.designation} />
          <Fact wide label="Phone" value={lead.contactPhone ? <a href={`tel:${formatPhoneDisplay(lead.contactPhone).replace(/\s/g, "")}`}><Phone size={13} aria-hidden="true" />{formatPhoneDisplay(lead.contactPhone)}</a> : ""} />
          <Fact wide label="Email" value={lead.contactEmail ? <a href={`mailto:${lead.contactEmail}`}><Mail size={13} aria-hidden="true" />{lead.contactEmail}</a> : ""} />
        </Section>

        <Section title="Sales & Plan" icon={WalletCards} className="crm-lead-sales">
          <Fact label="Interested plan" value={lead.plan} />
          <Fact label="Billing cycle" value={lead.billingCycle} />
          <Fact label="Source" value={lead.source} />
          <Fact label="Priority" value={<PriorityMark value={lead.priority} />} />
          <Fact label="Received" value={formatDateTime(lead.submittedAt)} />
          <Fact label="Created by" value={createdBy || "Inbound request"} />
        </Section>

        <Section title="Follow-up Details" icon={CalendarCheck2} className="crm-lead-followup">
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

        <Section title="Agreement & Registration" icon={Send} className="crm-lead-agreement">
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

        <section className="crm-lead-section crm-lead-activity">
          <h3><Clock3 size={16} aria-hidden="true" />Activity Timeline</h3>
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

function Section({ title, icon: Icon, className = "", children }) {
  return (
    <section className={`crm-lead-section ${className}`}>
      <h3>{Icon && <Icon size={16} aria-hidden="true" />}{title}</h3>
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

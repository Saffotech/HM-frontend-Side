import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BarChart3 } from "lucide-react";
import Button from "../../../../shared/components/Button";
import DataTable from "../../../../shared/components/DataTable";
import Input from "../../../../shared/components/Input";
import Modal from "../../../../shared/components/Modal";
import Pagination from "../../../../shared/components/Pagination";
import SearchBar from "../../../../shared/components/SearchBar";
import Select from "../../../../shared/components/Select";
import { usePlatform } from "../../../../shared/context/PlatformContext";
import { CLOSE_REASONS, CONTACT_METHODS, REQUEST_STATUSES } from "../../../../shared/data/tenantsData";
import { usePagination } from "../../../../shared/hooks/usePagination";
import { useToast } from "../../../../shared/hooks/useToast";
import { PLATFORM_BASE } from "../../../../shared/paths";
import { formatDate, formatDateTime, todayInput } from "../../../../shared/utils/formatDate";
import { includesQuery } from "../../../../shared/utils/table";
import CrmPerformance from "./crmPerformance/CrmPerformance";
import "./OnboardingRequests.css";

const tabs = [...REQUEST_STATUSES.filter((item) => item !== "Registered"), "All"];
const ANALYTICS = "Analytics";
const OUTCOME_FOLLOW_UP = "follow-up";
const OUTCOME_NOT_INTERESTED = "not-interested";
const blankContact = { method: CONTACT_METHODS[0], note: "", followUpDate: "", nextAction: "", outcome: OUTCOME_FOLLOW_UP, reason: CLOSE_REASONS[0] };
const blankClose = { reason: CLOSE_REASONS[0], note: "" };

export default function OnboardingRequests() {
  const navigate = useNavigate();
  const { onboarding, logOnboardingContact, closeOnboarding, reopenOnboarding } = usePlatform();
  const { push } = useToast();
  const [status, setStatus] = useState("New");
  const [search, setSearch] = useState("");
  const [viewId, setViewId] = useState(null);
  const [contactId, setContactId] = useState(null);
  const [contactForm, setContactForm] = useState(blankContact);
  const [contactError, setContactError] = useState("");
  const [closeId, setCloseId] = useState(null);
  const [closeForm, setCloseForm] = useState(blankClose);

  const today = todayInput();
  const requests = useMemo(() => onboarding.filter((request) => request.status !== "Registered"), [onboarding]);
  const viewing = requests.find((item) => item.id === viewId) || null;
  const contacting = requests.find((item) => item.id === contactId) || null;
  const closing = requests.find((item) => item.id === closeId) || null;

  const filtered = useMemo(() => requests.filter((request) => {
    const matchesStatus = status === "All" || request.status === status;
    return matchesStatus && includesQuery(
      [request.id, request.hospitalName, request.city, request.state, request.contactPerson, request.contactPhone, request.assignedTo],
      search,
    );
  }), [requests, search, status]);
  const pagination = usePagination(filtered, 10, `${status}|${search}`);
  const counts = useMemo(() => Object.fromEntries(tabs.map((item) => [
    item,
    item === "All" ? requests.length : requests.filter((request) => request.status === item).length,
  ])), [requests]);

  const openContact = (request) => {
    setContactId(request.id);
    setContactForm({ ...blankContact, followUpDate: request.followUpDate && request.followUpDate >= today ? request.followUpDate : "" });
    setContactError("");
  };

  const openClose = (request) => {
    setCloseId(request.id);
    setCloseForm(blankClose);
  };

  const saveContact = () => {
    if (!contactForm.note.trim()) {
      setContactError("Write what was discussed.");
      return;
    }
    const notInterested = contactForm.outcome === OUTCOME_NOT_INTERESTED;
    logOnboardingContact(contacting.id, {
      method: contactForm.method,
      note: contactForm.note.trim(),
      followUpDate: notInterested ? "" : contactForm.followUpDate,
      nextAction: notInterested ? "" : (contactForm.nextAction || "").trim(),
      notInterestedReason: notInterested ? contactForm.reason : "",
    });
    push(notInterested ? `${contacting.hospitalName} marked not interested.` : `Contact logged for ${contacting.hospitalName}.`, "success");
    setContactId(null);
  };

  const saveClose = () => {
    closeOnboarding(closing.id, { reason: closeForm.reason, note: closeForm.note.trim() });
    push(`${closing.hospitalName} marked not interested.`, "success");
    setCloseId(null);
    setViewId(null);
  };

  const reopen = (request) => {
    reopenOnboarding(request.id);
    push(`${request.hospitalName} reopened.`, "success");
  };

  const register = (request) => navigate(`${PLATFORM_BASE}/hospitals/register?request=${request.id}`);
  const notInterestedTab = status === "Not Interested";

  return (
    <section className="onboarding-page">
      <section className={`onb-panel ${status === ANALYTICS ? "onb-panel-analytics" : ""}`}>
        <nav className="onb-tabs" role="tablist" aria-label="Request status">
          {tabs.map((item) => (
            <button
              key={item}
              type="button"
              role="tab"
              aria-selected={status === item}
              className={`onb-tab ${status === item ? "active" : ""}`}
              onClick={() => setStatus(item)}
            >
              {item}
              <span className="onb-count">{counts[item]}</span>
            </button>
          ))}
          <button
            type="button"
            role="tab"
            aria-selected={status === ANALYTICS}
            className={`onb-tab ${status === ANALYTICS ? "active" : ""}`}
            onClick={() => setStatus(ANALYTICS)}
          >
            <BarChart3 size={15} aria-hidden="true" />
            {ANALYTICS}
          </button>
        </nav>
        {status === ANALYTICS ? <CrmPerformance /> : (
        <>
        <div className="onb-toolbar">
          <SearchBar value={search} onChange={setSearch} placeholder="Search by hospital, city, contact person, or staff" />
          <span className="onb-result">{filtered.length} request{filtered.length === 1 ? "" : "s"}</span>
        </div>
        <DataTable
          rows={pagination.rows}
          emptyTitle="No requests"
          emptyMessage="Nothing in this stage matches the search."
          columns={[
            {
              key: "hospitalName",
              label: "Hospital",
              render: (row) => (
                <>
                  <span className="onb-name">{row.hospitalName}</span>
                  <span className="onb-sub">{row.city}, {row.state}</span>
                </>
              ),
            },
            {
              key: "contactPerson",
              label: "Contact Person",
              render: (row) => (
                <>
                  <span>{row.contactPerson}</span>
                  <span className="onb-sub">{row.contactPhone}</span>
                </>
              ),
            },
            notInterestedTab ? {
              key: "closeReason",
              label: "Not Interested Reason",
              render: (row) => (
                <>
                  <span>{row.closeReason || "—"}</span>
                  {row.closeNote && <span className="onb-sub onb-clip" title={row.closeNote}>{row.closeNote}</span>}
                </>
              ),
            } : {
              key: "plan",
              label: "Interested In",
              render: (row) => (
                <>
                  <span>{row.plan} · {row.billingCycle}</span>
                  <span className="onb-sub">via {row.source}</span>
                </>
              ),
            },
            { key: "submittedAt", label: "Received", render: (row) => formatDate(row.submittedAt) },
            { key: "assignedTo", label: "Handled By", render: (row) => row.assignedTo || <span className="onb-sub">Unassigned</span> },
            ...(notInterestedTab ? [] : [{ key: "followUpDate", label: "Next Follow-up", render: (row) => <FollowUp request={row} today={today} /> }]),
            { key: "status", label: "Status", render: (row) => <StatusChip status={row.status} /> },
            {
              key: "actions",
              label: "Actions",
              render: (row) => (
                <div className="onb-actions">
                  <button type="button" className="action-link" onClick={() => setViewId(row.id)}>View</button>
                  {(row.status === "New" || row.status === "Contacted") && (
                    <button type="button" className="action-link danger" onClick={() => openClose(row)}>Close</button>
                  )}
                  {row.status === "Not Interested" && (
                    <button type="button" className="action-link" onClick={() => reopen(row)}>Reopen</button>
                  )}
                </div>
              ),
            },
          ]}
        />
        <Pagination {...pagination} onPageChange={pagination.setPage} />
        </>
        )}
      </section>

      <Modal
        open={Boolean(viewing)}
        title={viewing?.hospitalName || ""}
        subtitle={viewing ? `${viewing.id} · Received ${formatDateTime(viewing.submittedAt)}` : ""}
        onClose={() => setViewId(null)}
        size="lg"
        footer={viewing && (
          <>
            <Button variant="secondary" onClick={() => setViewId(null)}>Close</Button>
            {(viewing.status === "New" || viewing.status === "Contacted") && (
              <Button variant="secondary" onClick={() => { setViewId(null); openContact(viewing); }}>Log contact</Button>
            )}
            {viewing.status === "Contacted" && <Button onClick={() => register(viewing)}>Register hospital</Button>}
          </>
        )}
      >
        {viewing && (
          <>
            <dl className="onb-info-grid">
              <InfoRow label="Status" value={<StatusChip status={viewing.status} />} />
              <InfoRow label="Handled by" value={viewing.assignedTo || "Unassigned"} />
              <InfoRow label="Contact person" value={`${viewing.contactPerson}${viewing.designation ? ` (${viewing.designation})` : ""}`} />
              <InfoRow label="Phone" value={viewing.contactPhone} />
              <InfoRow label="Email" value={viewing.contactEmail} />
              <InfoRow label="Location" value={`${viewing.city}, ${viewing.state}`} />
              <InfoRow label="Hospital type" value={`${viewing.type}${viewing.beds ? ` · ${viewing.beds} beds` : ""}`} />
              <InfoRow label="Interested in" value={`${viewing.plan} · ${viewing.billingCycle}`} />
              <InfoRow label="Source" value={viewing.source} />
              <InfoRow label="Next follow-up" value={<FollowUp request={viewing} today={today} />} />
              {viewing.status === "Not Interested" && <InfoRow label="Not interested reason" value={viewing.closeReason} />}
              {viewing.status === "Not Interested" && viewing.closeNote && <InfoRow label="Note" value={viewing.closeNote} />}
            </dl>
            {viewing.message && (
              <div className="onb-message">
                <span>Message from hospital</span>
                <p>{viewing.message}</p>
              </div>
            )}
            <h3 className="onb-section-title">Contact history</h3>
            {viewing.activity.length === 0 ? (
              <p className="onb-empty">No one has contacted this hospital yet.</p>
            ) : (
              <ol className="onb-timeline">
                {viewing.activity.map((entry) => (
                  <li key={`${entry.at}-${entry.method}`}>
                    <div className="onb-timeline-head">
                      <strong>{entry.method}</strong>
                      <span>{entry.by} · {formatDateTime(entry.at)}</span>
                    </div>
                    <p>{entry.note}</p>
                  </li>
                ))}
              </ol>
            )}
          </>
        )}
      </Modal>

      <Modal
        open={Boolean(contacting)}
        title="Log contact"
        subtitle={contacting ? `${contacting.hospitalName} · ${contacting.contactPerson} · ${contacting.contactPhone}` : ""}
        onClose={() => setContactId(null)}
        footer={(
          <>
            <Button variant="secondary" onClick={() => setContactId(null)}>Cancel</Button>
            <Button variant={contactForm.outcome === OUTCOME_NOT_INTERESTED ? "danger" : "primary"} onClick={saveContact}>
              {contactForm.outcome === OUTCOME_NOT_INTERESTED ? "Mark not interested" : "Save"}
            </Button>
          </>
        )}
      >
        <div className="onb-form-grid">
          <Select label="How did you contact them?" value={contactForm.method} onChange={(event) => setContactForm({ ...contactForm, method: event.target.value })}>
            {CONTACT_METHODS.map((method) => <option key={method}>{method}</option>)}
          </Select>
          <Select label="Outcome" value={contactForm.outcome} onChange={(event) => setContactForm({ ...contactForm, outcome: event.target.value })}>
            <option value={OUTCOME_FOLLOW_UP}>Still interested</option>
            <option value={OUTCOME_NOT_INTERESTED}>Not interested</option>
          </Select>
          {contactForm.outcome === OUTCOME_NOT_INTERESTED ? (
            <Select className="onb-span-2" label="Reason" value={contactForm.reason} onChange={(event) => setContactForm({ ...contactForm, reason: event.target.value })}>
              {CLOSE_REASONS.map((reason) => <option key={reason}>{reason}</option>)}
            </Select>
          ) : (
            <Input
              type="date"
              className="onb-span-2"
              label="Next follow-up"
              value={contactForm.followUpDate}
              min={today}
              onChange={(event) => setContactForm({ ...contactForm, followUpDate: event.target.value })}
            />
          )}
          <Input
            as="textarea"
            className="onb-span-2"
            label="What was discussed?"
            value={contactForm.note}
            error={contactError}
            onChange={(event) => { setContactForm({ ...contactForm, note: event.target.value }); setContactError(""); }}
          />
        </div>
      </Modal>

      <Modal
        open={Boolean(closing)}
        title="Close request"
        subtitle={closing?.hospitalName}
        onClose={() => setCloseId(null)}
        footer={<><Button variant="secondary" onClick={() => setCloseId(null)}>Cancel</Button><Button variant="danger" onClick={saveClose}>Close request</Button></>}
      >
        <div className="onb-form-grid">
          <Select className="onb-span-2" label="Reason" value={closeForm.reason} onChange={(event) => setCloseForm({ ...closeForm, reason: event.target.value })}>
            {CLOSE_REASONS.map((reason) => <option key={reason}>{reason}</option>)}
          </Select>
          <Input
            as="textarea"
            className="onb-span-2"
            label="Notes (optional)"
            value={closeForm.note}
            onChange={(event) => setCloseForm({ ...closeForm, note: event.target.value })}
          />
        </div>
      </Modal>
    </section>
  );
}

function FollowUp({ request, today }) {
  const open = request.status === "New" || request.status === "Contacted";
  if (!open || !request.followUpDate) {
    if (open && request.status === "New") return <span className="onb-due onb-due-new">Call pending</span>;
    return <span className="onb-sub">—</span>;
  }
  if (request.followUpDate < today) return <span className="onb-due onb-due-late">{formatDate(request.followUpDate)} · Overdue</span>;
  if (request.followUpDate === today) return <span className="onb-due onb-due-today">Today</span>;
  return <span>{formatDate(request.followUpDate)}</span>;
}

function StatusChip({ status }) {
  const tone = {
    New: "new",
    Contacted: "contacted",
    Registered: "registered",
    "Not Interested": "closed",
  }[status] || "new";
  return <span className={`onb-chip onb-chip-${tone}`}>{status}</span>;
}

function InfoRow({ label, value }) {
  return (
    <div className="onb-info-row">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { interpretPlatformError, shouldEndPlatformSession } from "../../../shared/api/platformErrors";
import { mapRegistration } from "../../../shared/api/hospitalRegistration";
import { platformAuth } from "../../../shared/api/platformSession";
import { getRegistration, listRegistrations } from "../../../shared/api/registrationApi";
import Button from "../../../shared/components/Button";
import DataTable from "../../../shared/components/DataTable";
import Modal from "../../../shared/components/Modal";
import SearchBar from "../../../shared/components/SearchBar";
import { usePlatform } from "../../../shared/context/PlatformContext";
import { accountsPath } from "../../../shared/paths";
import { formatDate, formatDateTime } from "../../../shared/utils/formatDate";
import { includesQuery } from "../../../shared/utils/table";
import { InfoBox, InfoRow } from "../components/InvoiceParts";
import "../Accountant.css";
import "./InvoicesPayments.css";
import "./Registrations.css";

const TABS = ["To register", "Registered"];

export default function Registrations() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signOutPortal } = usePlatform();
  const signOutRef = useRef(signOutPortal);
  signOutRef.current = signOutPortal;
  const [tab, setTab] = useState(() => (TABS.includes(location.state?.tab) ? location.state.tab : "To register"));
  const [search, setSearch] = useState("");
  const [viewId, setViewId] = useState(null);
  const [waiting, setWaiting] = useState([]);
  const [registered, setRegistered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [agreed, done] = await Promise.all([
        listRegistrations("agreed"),
        listRegistrations("registered"),
      ]);
      setWaiting((Array.isArray(agreed) ? agreed : []).map(mapRegistration));
      setRegistered((Array.isArray(done) ? done : []).map(mapRegistration));
    } catch (err) {
      const result = interpretPlatformError(err);
      setWaiting([]);
      setRegistered([]);
      setError(result.toast);
      if (shouldEndPlatformSession(err)) signOutRef.current("accountant");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const source = tab === "To register" ? waiting : registered;
  const rows = source.filter((item) => includesQuery([item.hospitalName, item.city, item.contactPerson, item.agreedBy, item.plan, item.hospitalCode], search));
  const viewing = useMemo(
    () => waiting.find((item) => item.id === viewId) || registered.find((item) => item.id === viewId) || null,
    [registered, viewId, waiting],
  );
  const counts = { "To register": waiting.length, Registered: registered.length };
  const submitted = viewing ? platformAuth.recallLeadSubmission(viewing.id) : null;


  const openRow = async (row) => {
    setViewId(row.id);
    if (row.status !== "Registered" || row.hospitalCode) return;
    try {
      const detail = mapRegistration(await getRegistration(row.id));
      setRegistered((current) => current.map((item) => (item.id === row.id ? { ...item, ...detail } : item)));
    } catch {
      /* The list row remains usable when the detail call fails. */
    }
  };

  const hospitalCell = (row) => (
    <>
      <span className="inv-name">{row.hospitalName}</span>
      <span className="inv-sub">{[row.city, row.state].filter(Boolean).join(", ") || "—"}</span>
    </>
  );

  const waitingColumns = [
    { key: "hospital", label: "Hospital", render: hospitalCell },
    { key: "contact", label: "Contact", render: (row) => <><span className="inv-name">{row.contactPerson}</span><span className="inv-sub">{row.contactPhone}</span></> },
    { key: "plan", label: "Agreed plan", render: (row) => <span className="inv-name">{row.plan || "—"} · {row.billingCycle || "—"}</span> },
    { key: "agreed", label: "Sent by CRM", render: (row) => <><span className="inv-name">{row.agreedBy || "—"}</span><span className="inv-sub">{formatDate(row.agreedAt)}</span></> },
    { key: "note", label: "Note from CRM", render: (row) => <span className="hr-note" title={row.handoverNote}>{row.handoverNote || "—"}</span> },
    {
      key: "actions",
      label: "Actions",
      render: (row) => (
        <div className="inv-actions">
          <button type="button" className="action-link" onClick={() => openRow(row)}>View</button>
        </div>
      ),
    },
  ];

  const registeredColumns = [
    { key: "hospital", label: "Hospital", render: hospitalCell },
    { key: "code", label: "Code", render: (row) => row.hospitalCode || (row.hospitalId != null ? `ID ${row.hospitalId}` : "—") },
    { key: "plan", label: "Plan", render: (row) => `${row.plan || "—"} · ${row.billingCycle || "—"}` },
    { key: "crm", label: "Agreed by (CRM)", render: (row) => row.agreedBy || "—" },
    { key: "registeredBy", label: "Registered by", render: (row) => row.registeredBy || "—" },
    { key: "registeredAt", label: "Registered", render: (row) => formatDate(row.registeredAt) },
    {
      key: "actions",
      label: "Actions",
      render: (row) => (
        <div className="inv-actions">
          <button type="button" className="action-link" onClick={() => openRow(row)}>View</button>
        </div>
      ),
    },
  ];

  return (
    <section className="inv-page hr-page">
      <section className="inv-panel">
        <nav className="hr-tabs" role="tablist" aria-label="Registration status">
          {TABS.map((item) => (
            <button key={item} type="button" role="tab" aria-selected={tab === item} className={tab === item ? "active" : ""} onClick={() => setTab(item)}>
              {item}
              <span>{counts[item]}</span>
            </button>
          ))}
        </nav>
        <div className="hr-toolbar">
          <SearchBar value={search} onChange={setSearch} placeholder="Search hospital, city, contact or CRM name" />
        </div>
        {error && (
          <div className="hr-load-error" role="alert">
            {error}
            <Button variant="secondary" onClick={load}>Retry</Button>
          </div>
        )}
        <DataTable
          rows={loading ? [] : rows}
          columns={tab === "To register" ? waitingColumns : registeredColumns}
          emptyTitle={loading ? "Loading registrations" : error ? "Registrations could not be loaded" : search.trim() ? "No hospitals match your search." : tab === "To register" ? "Nothing to register" : "No registrations yet"}
          emptyMessage={loading ? "Fetching the registration queue." : error ? "Retry the request. Nothing was saved in this browser." : search.trim() ? "Try a hospital name, city or contact." : tab === "To register" ? "Hospitals appear here when CRM marks them as agreed." : "Hospitals you register will appear here."}
        />
      </section>

      <Modal
        open={Boolean(viewing)}
        title={viewing?.hospitalName || "Hospital"}
        subtitle={viewing ? `${viewing.id} · ${viewing.status === "Registered" ? "Registered" : "Agreed"} ${formatDateTime(viewing.status === "Registered" ? viewing.registeredAt : viewing.agreedAt)}` : ""}
        onClose={() => setViewId(null)}
        size="lg"
        footer={viewing && (
          <div className="inv-modal-footer">
            <Button variant="secondary" onClick={() => setViewId(null)}>Close</Button>
            {viewing.status === "Agreed" && (
              <Button onClick={() => navigate(accountsPath(`/registrations/${viewing.id}`))}>Register hospital</Button>
            )}
          </div>
        )}
      >
        {viewing && (
          <div className="inv-view">
            <section className="inv-hero hr-hero">
              <div>
                <span className="inv-hero-label">{viewing.status === "Registered" ? "Plan on the lead" : "Agreed plan"}</span>
                <strong className="inv-hero-amount">{viewing.plan || "—"} · {viewing.billingCycle || "—"}</strong>
                <span className="inv-hero-sub">Plan names come from the lead. The server does not publish prices.</span>
              </div>
              <div className="inv-hero-side">
                <span className="hr-chip">{viewing.status === "Registered" ? "Registered" : "Waiting for registration"}</span>
                <span className="inv-hero-due">Sent by {viewing.agreedBy || "CRM"} (CRM)</span>
              </div>
            </section>

            <div className="inv-view-grid">
              <InfoBox title="Hospital">
                <InfoRow label="Name" value={viewing.hospitalName} />
                <InfoRow label="Type" value={viewing.type} />
                <InfoRow label="Location" value={[viewing.city, viewing.state].filter(Boolean).join(", ")} />
                <InfoRow label="Hospital email" value={viewing.hospitalEmail} />
                {viewing.status === "Registered" && <InfoRow label="Hospital id" value={viewing.hospitalId ?? "—"} />}
                {viewing.status === "Registered" && <InfoRow label="Hospital code" value={viewing.hospitalCode || "Not included in the queue response"} />}
              </InfoBox>
              <InfoBox title="Contact">
                <InfoRow label="Contact person" value={viewing.contactPerson} />
                <InfoRow label="Designation" value={viewing.designation} />
                <InfoRow label="Phone" value={viewing.contactPhone} />
                <InfoRow label="Email" value={viewing.contactEmail} />
              </InfoBox>
            </div>

            <InfoBox title={viewing.status === "Registered" ? "Registration" : "Handover from CRM"}>
              <InfoRow label="Agreed by" value={viewing.agreedBy} />
              <InfoRow label="Agreed on" value={formatDateTime(viewing.agreedAt)} />
              <InfoRow label="Lead source" value={viewing.source} />
              {viewing.status === "Registered" && <InfoRow label="Registered by" value={viewing.registeredBy} />}
              {viewing.status === "Registered" && <InfoRow label="Registered on" value={formatDateTime(viewing.registeredAt)} />}
              {viewing.handoverNote && <p className="hr-handover">{viewing.handoverNote}</p>}
              {viewing.status === "Registered" && submitted && (
                <p className="hr-handover">Submitted with this registration: trial {submitted.trialPeriod || "—"}, tenant status {submitted.tenantStatus || "—"}. Renewal dates are not in this response.</p>
              )}
              {viewing.status === "Registered" && !submitted && (
                <p className="hr-handover">Trial period, tenant status, and renewal dates are not included in the registration response.</p>
              )}
            </InfoBox>
          </div>
        )}
      </Modal>
    </section>
  );
}

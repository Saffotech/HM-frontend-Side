import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Handshake } from "lucide-react";
import Button from "../../../shared/components/Button";
import DataTable from "../../../shared/components/DataTable";
import Modal from "../../../shared/components/Modal";
import SearchBar from "../../../shared/components/SearchBar";
import { usePlatform } from "../../../shared/context/PlatformContext";
import { accountsPath } from "../../../shared/paths";
import { formatDate, formatDateTime } from "../../../shared/utils/formatDate";
import { formatCurrency } from "../../../shared/utils/formatCurrency";
import { priceFor } from "../../../shared/utils/hospitals";
import { includesQuery } from "../../../shared/utils/table";
import { InfoBox, InfoRow } from "../components/InvoiceParts";
import "../Accountant.css";
import "./InvoicesPayments.css";
import "./Registrations.css";

const TABS = ["To register", "Registered"];

export default function Registrations() {
  const navigate = useNavigate();
  const location = useLocation();
  const { onboarding, plans, hospitals } = usePlatform();
  const [tab, setTab] = useState(() => (TABS.includes(location.state?.tab) ? location.state.tab : "To register"));
  const [search, setSearch] = useState("");
  const [viewId, setViewId] = useState(null);

  const waiting = useMemo(() => onboarding
    .filter((item) => item.status === "Agreed")
    .sort((a, b) => String(a.agreedAt).localeCompare(String(b.agreedAt))), [onboarding]);
  const registered = useMemo(() => onboarding
    .filter((item) => item.status === "Registered")
    .sort((a, b) => String(b.registeredAt).localeCompare(String(a.registeredAt))), [onboarding]);
  const source = tab === "To register" ? waiting : registered;
  const rows = source.filter((item) => includesQuery([item.hospitalName, item.city, item.contactPerson, item.agreedBy, item.assignedTo, item.plan], search));
  const viewing = waiting.find((item) => item.id === viewId) || null;
  const counts = { "To register": waiting.length, Registered: registered.length };

  const cyclePrice = (request) => {
    const plan = plans.find((item) => item.name === request.plan);
    return plan ? formatCurrency(priceFor(plan, request.billingCycle, false).amount) : "—";
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
    { key: "plan", label: "Agreed plan", render: (row) => <><span className="inv-name">{row.plan} · {row.billingCycle}</span><span className="inv-sub">{cyclePrice(row)} per {row.billingCycle === "Annual" ? "year" : "month"}</span></> },
    { key: "agreed", label: "Sent by CRM", render: (row) => <><span className="inv-name">{row.agreedBy || row.assignedTo || "—"}</span><span className="inv-sub">{formatDate(row.agreedAt)}</span></> },
    { key: "note", label: "Note from CRM", render: (row) => <span className="hr-note" title={row.handoverNote}>{row.handoverNote || "—"}</span> },
    {
      key: "actions",
      label: "Actions",
      render: (row) => (
        <div className="inv-actions">
          <button type="button" className="action-link" onClick={() => setViewId(row.id)}>View</button>
        </div>
      ),
    },
  ];

  const registeredColumns = [
    { key: "hospital", label: "Hospital", render: hospitalCell },
    { key: "plan", label: "Plan", render: (row) => `${row.plan} · ${row.billingCycle}` },
    { key: "crm", label: "Agreed by (CRM)", render: (row) => row.agreedBy || row.assignedTo || "—" },
    { key: "registeredBy", label: "Registered by", render: (row) => row.registeredBy || "—" },
    { key: "registeredAt", label: "Registered", render: (row) => formatDate(row.registeredAt) },
    {
      key: "actions",
      label: "Actions",
      render: (row) => (
        <div className="inv-actions">
          {hospitals.some((item) => item.id === row.hospitalId) ? (
            <button type="button" className="action-link" onClick={() => navigate(accountsPath(`/hospitals/${row.hospitalId}`))}>View</button>
          ) : <span className="inv-sub">—</span>}
        </div>
      ),
    },
  ];

  return (
    <section className="inv-page hr-page">
      <section className="hr-flow" aria-label="How registration works">
        <Handshake size={18} aria-hidden="true" />
        <p>CRM marks a hospital as <strong>Agreed</strong> once it accepts a plan. It then appears here. Register it to create the hospital account; CRM will see it as converted.</p>
      </section>

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
        <DataTable
          rows={rows}
          columns={tab === "To register" ? waitingColumns : registeredColumns}
          emptyTitle={search.trim() ? "No hospitals match your search." : tab === "To register" ? "Nothing to register" : "No registrations yet"}
          emptyMessage={search.trim() ? "Try a hospital name, city or contact." : tab === "To register" ? "Hospitals appear here when CRM marks them as agreed." : "Hospitals you register will appear here."}
        />
      </section>

      <Modal
        open={Boolean(viewing)}
        title={viewing?.hospitalName || "Hospital"}
        subtitle={viewing ? `${viewing.id} · Agreed ${formatDateTime(viewing.agreedAt)}` : ""}
        onClose={() => setViewId(null)}
        size="lg"
        footer={viewing && (
          <div className="inv-modal-footer">
            <Button variant="secondary" onClick={() => setViewId(null)}>Close</Button>
            <Button onClick={() => navigate(accountsPath(`/registrations/${viewing.id}`))}>Register hospital</Button>
          </div>
        )}
      >
        {viewing && (
          <div className="inv-view">
            <section className="inv-hero hr-hero">
              <div>
                <span className="inv-hero-label">Agreed plan</span>
                <strong className="inv-hero-amount">{viewing.plan} · {viewing.billingCycle}</strong>
                <span className="inv-hero-sub">{cyclePrice(viewing)} per {viewing.billingCycle === "Annual" ? "year" : "month"}</span>
              </div>
              <div className="inv-hero-side">
                <span className="hr-chip">Waiting for registration</span>
                <span className="inv-hero-due">Sent by {viewing.agreedBy || viewing.assignedTo} (CRM)</span>
              </div>
            </section>

            <div className="inv-view-grid">
              <InfoBox title="Hospital">
                <InfoRow label="Name" value={viewing.hospitalName} />
                <InfoRow label="Type" value={viewing.type} />
                <InfoRow label="Location" value={[viewing.city, viewing.state].filter(Boolean).join(", ")} />
                <InfoRow label="Hospital email" value={viewing.hospitalEmail} />
              </InfoBox>
              <InfoBox title="Contact">
                <InfoRow label="Contact person" value={viewing.contactPerson} />
                <InfoRow label="Designation" value={viewing.designation} />
                <InfoRow label="Phone" value={viewing.contactPhone} />
                <InfoRow label="Email" value={viewing.contactEmail} />
              </InfoBox>
            </div>

            <InfoBox title="Handover from CRM">
              <InfoRow label="Agreed by" value={viewing.agreedBy || viewing.assignedTo} />
              <InfoRow label="Agreed on" value={formatDateTime(viewing.agreedAt)} />
              <InfoRow label="Lead source" value={viewing.source} />
              {viewing.handoverNote && <p className="hr-handover">{viewing.handoverNote}</p>}
            </InfoBox>
          </div>
        )}
      </Modal>
    </section>
  );
}

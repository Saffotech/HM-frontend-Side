import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { interpretPlatformError } from "../../../../shared/api/platformErrors";
import { getTenant } from "../../../../shared/api/registrationApi";
import Button from "../../../../shared/components/Button";
import EmptyState from "../../../../shared/components/EmptyState";
import { platformPath } from "../../../../shared/paths";
import { formatDate } from "../../../../shared/utils/formatDate";
import "./TenantDetails.css";

export default function TenantDetails() {
  const { tenantId } = useParams();
  const navigate = useNavigate();
  const [tenant, setTenant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    getTenant(tenantId)
      .then((body) => {
        if (!cancelled) setTenant(body);
      })
      .catch((err) => {
        if (!cancelled) setError(interpretPlatformError(err).toast);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tenantId]);

  if (loading) {
    return (
      <section className="td-panel td-pad">
        <EmptyState title="Loading hospital" message="Fetching this hospital from the server." />
      </section>
    );
  }

  if (!tenant) {
    return (
      <section className="td-panel td-pad">
        <EmptyState
          title="Hospital not found"
          message={error || "This hospital is not on the server."}
          action={<Button onClick={() => navigate(platformPath("/hospitals"))}>Back to hospitals</Button>}
        />
      </section>
    );
  }

  return <RegisteredFromApi tenant={tenant} onBack={() => navigate(platformPath("/hospitals"))} />;
}

function showDay(value) {
  if (!value) return "—";
  const day = String(value).slice(0, 10);
  return formatDate(`${day}T00:00:00`);
}

function RegisteredFromApi({ tenant, onBack }) {
  return (
    <section className="td-page">
      <button type="button" className="td-back" onClick={onBack}>
        <ArrowLeft size={14} aria-hidden="true" />Back to hospitals
      </button>
      <header className="td-record">
        <div className="td-identity">
          <div className="td-logo" aria-hidden="true">{(tenant.name || "H").split(" ").slice(0, 2).map((word) => word[0]).join("")}</div>
          <div>
            <div className="td-title-row">
              <h1>{tenant.name}</h1>
              <Chip value={tenant.subscription_status} />
            </div>
            <div className="td-meta">
              <span className="td-mono">{tenant.tenant_id}</span>
              <span className="td-mono">{tenant.code}</span>
              <span>{tenant.hospital_type}</span>
            </div>
          </div>
        </div>
      </header>
      <p className="td-api-note">
        This hospital was registered on the server. Suspend, usage, invoices, and activity are unavailable because those APIs do not exist.
      </p>
      <section className="td-panel">
        <div className="td-body">
          <div className="td-two">
            <Box title="Hospital">
              <Info label="Tenant id" value={<span className="td-mono">{tenant.tenant_id}</span>} />
              <Info label="Code" value={<span className="td-mono">{tenant.code}</span>} />
              <Info label="Type" value={tenant.hospital_type} />
              <Info label="Administrator" value={tenant.admin_email} />
              <Info label="Administrator user" value={tenant.admin_user_id} />
              <Info label="Can sign in" value={tenant.is_active ? "Yes" : "No"} />
            </Box>
            <Box title="Subscription">
              <Info label="Plan" value={`${tenant.plan} · ${tenant.billing_cycle}`} />
              <Info label="Subscription status" value={<Chip value={tenant.subscription_status} />} />
              <Info label="Tenant status" value={tenant.tenant_status} />
              <Info label="Trial period" value={tenant.trial_period} />
              <Info label="Started" value={showDay(tenant.subscription_started_on)} />
              <Info label="Renews" value={showDay(tenant.subscription_renews_on)} />
            </Box>
          </div>
        </div>
      </section>
    </section>
  );
}

const chipTones = {
  Active: "green",
  Trial: "blue",
  Suspended: "amber",
};

function Chip({ value }) {
  return <span className={`td-chip td-chip-${chipTones[value] || "grey"}`}>{value}</span>;
}

function Box({ title, children }) {
  return (
    <section className="td-box">
      <header>
        <h2>{title}</h2>
      </header>
      <div className="td-box-body">{children}</div>
    </section>
  );
}

function Info({ label, value }) {
  return (
    <div className="td-info">
      <span>{label}</span>
      <strong>{value ?? "—"}</strong>
    </div>
  );
}

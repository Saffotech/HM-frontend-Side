import { formatPersonName } from "@/shared/utils/formatPersonName";
import { formatDateTime } from "../../../shared/utils/formatDate";
import { formatPhoneDisplay } from "../../../shared/utils/phoneNumbers";

function text(value) {
  return String(value ?? "").trim();
}

function Row({ label, value, chip = false }) {
  const shown = text(value);
  const className = shown ? (chip ? "lf-chip" : undefined) : "is-empty";
  return (
    <div className="lf-line">
      <dt>{label}</dt>
      <dd className={className}>{shown || "Not Set"}</dd>
    </div>
  );
}

function phone(value) {
  const shown = text(value);
  return shown ? formatPhoneDisplay(shown) : "";
}

export default function HospitalCrmInfo({ c }) {
  const crm = c?.crm || {};
  return (
    <section className="sec lf-crm">
      <h3>Hospital &amp; CRM Information</h3>
      {c?.commercialChange ? <p className="lf-review-banner">{c.commercialChange}</p> : null}
      <dl className="lf-sheet">
        <div>
          <Row label="Hospital" value={crm.hospitalName || c?.h} />
          <Row label="City" value={crm.city || c?.city} />
          <Row label="Contact" value={formatPersonName(crm.contactPerson)} />
          <Row label="Phone" value={phone(crm.contactPhone)} />
          <Row label="Email" value={crm.contactEmail} />
          <Row label="Hospital email" value={crm.hospitalEmail} />
        </div>
        <div>
          <Row label="Plan" value={crm.plan || c?.plan} chip />
          <Row label="Agreed" value={crm.agreedAt ? formatDateTime(crm.agreedAt) : ""} />
          <Row label="Handover note" value={crm.handoverNote} />
        </div>
      </dl>
    </section>
  );
}

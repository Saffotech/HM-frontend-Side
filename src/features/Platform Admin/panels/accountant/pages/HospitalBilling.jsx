import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import UnavailableFeature from "../../../shared/components/UnavailableFeature";
import { accountsPath } from "../../../shared/paths";
import "../Accountant.css";
import "./HospitalBilling.css";

export default function HospitalBilling() {
  return (
    <section className="inv-page hb-page">
      <Link to={accountsPath("/invoices")} className="hb-back">
        <ArrowLeft size={14} aria-hidden="true" />
        Invoices & Payments
      </Link>
      <UnavailableFeature
        title="Hospital billing is unavailable"
        message="There is no backend API for a hospital's platform invoices or subscription history. Registered hospitals are listed on Hospital Registrations."
      />
    </section>
  );
}

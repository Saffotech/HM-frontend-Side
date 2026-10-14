import { useState } from "react";
import { Link } from "react-router-dom";
import { platformPath } from "../../../../shared/paths";
import "./HelpDocumentation.css";

const modules = [
  ["Dashboard", "Review tenant counts, revenue, and items that need attention.", platformPath("/")],
  ["Hospitals", "Search tenants, change sample status, and open a hospital record.", platformPath("/hospitals")],
  ["Register Hospital", "Validate a new demonstration tenant and add it to the local list.", platformPath("/hospitals/register")],
  ["CRM & Performance", "Follow up hospital requests, log calls, and track CRM team performance.", platformPath("/crm-performance")],
  ["Billing", "Review plans, subscriptions, and printable sample invoices.", platformPath("/billing/plans")],
  ["Profile", "Update your name, contact details, and display density.", platformPath("/profile")],
];

const faqs = [
  ["Does this dashboard talk to a hospital or payment provider?", "No. Every screen uses demonstration records stored in this browser."],
  ["Will suspend or register change a real tenant?", "No. Those actions update the local sample list and add an activity entry."],
];

export default function HelpDocumentation() {
  const [open, setOpen] = useState(0);

  return (
    <section>
      <div className="help-grid">
        <section className="card card-pad">
          <h2>Navigation guide</h2>
          <p className="panel-copy">Use the sidebar groups to move between overview, tenants, billing, and your account.</p>
          <ul className="list-reset link-list">
            {modules.map(([title, copy, href]) => (
              <li key={href}>
                <Link to={href}>
                  <span><strong>{title}</strong><span className="muted" style={{ display: "block" }}>{copy}</span></span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
        <section className="card card-pad faq">
          <h2>Frequently asked questions</h2>
          {faqs.map(([question, answer], index) => (
            <div key={question}>
              <button type="button" aria-expanded={open === index} onClick={() => setOpen(open === index ? -1 : index)}>{question}</button>
              {open === index && <p>{answer}</p>}
            </div>
          ))}
        </section>
      </div>
      <section className="card card-pad" style={{ marginTop: 16 }}>
        <h2>Troubleshooting</h2>
        <ul>
          <li>If a hospital you registered is missing, check the search box and status filter, then reset filters.</li>
          <li>If charts look empty, widen the analytics period to the last 12 months.</li>
          <li>If the layout feels cramped, set Display density to Comfortable on My Profile and save.</li>        </ul>
      </section>
    </section>
  );
}

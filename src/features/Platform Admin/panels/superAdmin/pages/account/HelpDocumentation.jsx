import { useState } from "react";
import { Link } from "react-router-dom";
import { platformPath } from "../../../../shared/paths";
import "./HelpDocumentation.css";

const modules = [
  ["Hospitals", "Register a hospital with POST /tenants. The directory lists every hospital on the server.", platformPath("/hospitals")],
  ["Register Hospital", "Creates a tenant and hospital admin on the server.", platformPath("/hospitals/register")],
  ["CRM", "Work leads in the CRM portal. Company-wide CRM analytics are not available.", platformPath("/crm-performance")],
  ["Accountant", "Register agreed leads from the Accountant portal.", "/platform/accounts/registrations"],
  ["Profile", "Shows GET /auth/me. Profile edits are not available.", platformPath("/profile")],
];

const faqs = [
  ["Does dashboard analytics use live hospital data?", "Hospital counts, registrations, plans, and locations come from GET /tenants. Revenue and CRM figures stay empty until those APIs exist."],
  ["Does register hospital create a real tenant?", "Yes. POST /tenants creates the hospital. The directory lists hospitals registered by platform admin and by the accountant."],
];

export default function HelpDocumentation() {
  const [open, setOpen] = useState(0);

  return (
    <section>
      <div className="help-grid">
        <section className="card card-pad">
          <h2>Navigation guide</h2>
          <p className="panel-copy">Use the sidebar to register hospitals or open CRM and Accountant on their APIs.</p>
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
    </section>
  );
}

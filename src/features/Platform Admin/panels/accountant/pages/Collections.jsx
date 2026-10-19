import { useState } from "react";
import { Link } from "react-router-dom";
import { accountsPath } from "../../../shared/paths";
import "../Accountant.css";

const CARDS = [
  { key: "today", label: "Due today", tone: "accounts-stat-today" },
  { key: "overdue", label: "Overdue", tone: "accounts-stat-overdue" },
  { key: "pending", label: "Pending", tone: "" },
  { key: "collected", label: "Collected", tone: "accounts-stat-collected" },
];

export default function Collections() {
  const [active, setActive] = useState("");

  return (
    <section className="portal-page accounts-home">
      <p className="accounts-note">
        The queue stays empty until an invoice API is connected. Agreed leads are registered from Hospital Registrations.
      </p>

      <div className="portal-stats accounts-stats">
        {CARDS.map((card) => (
          <button
            key={card.key}
            type="button"
            className={`card accounts-stat ${card.tone}${active === card.key ? " is-active" : ""}`.trim()}
            onClick={() => setActive((current) => (current === card.key ? "" : card.key))}
          >
            <span>{card.label}</span>
            <strong>—</strong>
            <span className="accounts-count">0 invoices</span>
          </button>
        ))}
      </div>

      <section className="card card-pad">
        <div className="portal-head">
          <div>
            <h2>Collection queue</h2>
            <p>Unpaid invoices that need a follow-up.</p>
          </div>
          <Link to={accountsPath("/invoices")}>All invoices</Link>
        </div>
        <div className="portal-table-wrap">
          <table className="portal-table accounts-queue">
            <thead>
              <tr>
                <th>Hospital</th>
                <th>Invoice</th>
                <th>Due</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={6}>
                  <p className="accounts-empty">
                    <strong>No invoices in this queue.</strong>
                    <span>Payments are not stored until a billing API exists.</span>
                  </p>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <div className="portal-split accounts-lower">
        <section className="card card-pad">
          <div className="portal-head">
            <h2>Recent collections</h2>
          </div>
          <p className="accounts-empty">
            <strong>Nothing collected yet.</strong>
            <span>Paid invoices will list here.</span>
          </p>
        </section>
        <section className="card card-pad">
          <div className="portal-head">
            <h2>Failed payments</h2>
          </div>
          <p className="accounts-empty">
            <strong>No failed payments.</strong>
            <span>Failed charges will list here.</span>
          </p>
        </section>
      </div>
    </section>
  );
}

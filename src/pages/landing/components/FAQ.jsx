import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import './FAQ.css';

const FAQS = [
  {
    q: 'Which hospital roles does SaffoCare support?',
    a: 'SaffoCare supports Super Admin, Admin, OPD, Doctor, Nurse, Lab, Receptionist, and Pharmacy — each with a role-specific workspace. Permissions differ by role (for example, OPD has operational powers; Receptionist mainly guides).',
  },
  {
    q: 'Can all departments work in one system?',
    a: 'Yes. OPD, doctors, nurses, lab, pharmacy, and receptionist share the same hospital data so teams stay in sync without switching tools.',
  },
  {
    q: 'What can the OPD team do?',
    a: 'OPD handles the operational work — patient registration, appointments, beds, billing, and payments. Receptionist can guide visitors and support queue flow, but does not get OPD permissions for those actions.',
  },
  {
    q: 'Do doctors and nurses get clinical tools?',
    a: 'Doctors can manage consultations, records, and prescriptions. Nurses can record vitals, nursing notes, medications, and track the patient queue.',
  },
  {
    q: 'Is pharmacy and lab included?',
    a: 'Yes. Pharmacy supports prescription dispensing and stock workflows. Lab supports order tracking, sample handling, and report uploads for clinicians.',
  },
  {
    q: 'Is billing part of the system?',
    a: 'Yes. OPD billing and payments are built into the platform so charges stay linked to the patient visit and OPD workflow.',
  },
  {
    q: 'How is access controlled?',
    a: 'Staff sign in with role-based permissions. For example, OPD can register patients and bill, while Receptionist is limited to guidance and queue support without those OPD powers.',
  },
  {
    q: 'Is patient login available?',
    a: 'A Patient Portal is planned in the product roadmap. For now, staff modules are available; patient self-login is temporarily disabled on the website.',
  },
];


export default function FAQ() {
  const [openIndex, setOpenIndex] = useState(null);

  return (
    <section className="landing-faq">
      <div className="landing-container landing-faq__container">
        <div className="landing-faq__header">
          <h2 className="landing-section-title">Frequently asked questions</h2>
        </div>
        <div className="landing-faq__list">
          {FAQS.map((f, i) => {
            const isOpen = openIndex === i;
            return (
              <div key={f.q} className={`landing-faq__item${isOpen ? ' landing-faq__item--open' : ''}`}>
                <button
                  type="button"
                  className="landing-faq__trigger"
                  aria-expanded={isOpen}
                  onClick={() => setOpenIndex(isOpen ? null : i)}
                >
                  <span>{f.q}</span>
                  <ChevronDown size={18} className="landing-faq__chevron" aria-hidden />
                </button>
                {isOpen && <div className="landing-faq__content">{f.a}</div>}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

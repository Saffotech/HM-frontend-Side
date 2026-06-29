import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import './FAQ.css';

const FAQS = [
  { q: 'Is the system cloud-based?', a: 'Yes. SaffoCare is fully cloud-hosted with enterprise-grade security and 99.9% uptime.' },
  { q: 'Can all hospital departments use the system together?', a: 'Absolutely — admin, doctors, reception, pharmacy, lab and billing all collaborate in real time.' },
  { q: 'Does it support online appointments?', a: 'Yes, with a patient portal, queue management, SMS/email reminders and rescheduling.' },
  { q: 'Can doctors access records remotely?', a: 'Yes. EMR access is available securely from any device with role-based permissions.' },
  { q: 'Is billing integrated?', a: 'Billing, insurance claims, payments, refunds and tax are fully integrated with reporting.' },
  { q: 'Does it support role-based permissions?', a: 'Yes — granular role permissions ensure each staff member sees only what they need.' },
  { q: 'Is patient data secure?', a: 'Data is encrypted at rest and in transit, with audit logs, MFA and HIPAA-ready controls.' },
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

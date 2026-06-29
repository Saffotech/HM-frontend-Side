import { CalendarClock, ClipboardList, FlaskConical, Receipt, Stethoscope } from 'lucide-react';
import './Workflow.css';

const STEPS = [
  { icon: ClipboardList, title: 'Patient Registration', desc: 'Quick onboarding with digital records and insurance details.' },
  { icon: CalendarClock, title: 'Appointment Scheduling', desc: 'Online booking, queue and automated reminders.' },
  { icon: Stethoscope, title: 'Doctor Consultation', desc: 'EMR access with prescriptions and treatment plans.' },
  { icon: FlaskConical, title: 'Lab & Pharmacy', desc: 'Integrated test orders, results and medicine dispatch.' },
  { icon: Receipt, title: 'Billing & Reports', desc: 'Invoices, insurance, and analytics in one click.' },
];

export default function Workflow() {
  return (
    <section className="landing-workflow">
      <div className="landing-container">
        <div className="landing-workflow__header">
          <h2 className="landing-section-title">How the System Works</h2>
          <p className="landing-section-sub">A connected workflow from the front desk to checkout.</p>
        </div>
        <div className="landing-workflow__steps">
          <div className="landing-workflow__line" aria-hidden />
          {STEPS.map((s, i) => (
            <div key={s.title} className="landing-workflow__step">
              <div className="landing-workflow__icon-wrap">
                <s.icon size={24} aria-hidden />
                <span className="landing-workflow__num">{i + 1}</span>
              </div>
              <h3>{s.title}</h3>
              <p>{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

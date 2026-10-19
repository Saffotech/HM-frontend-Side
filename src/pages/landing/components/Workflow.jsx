import { CalendarClock, ClipboardList, FlaskConical, Receipt, Stethoscope } from 'lucide-react';
import Reveal from './Reveal';
import './Workflow.css';

const STEPS = [
  { icon: ClipboardList, title: 'Patient Registration', desc: 'OPD registers the patient and opens the visit.' },
  { icon: CalendarClock, title: 'Appointment / OPD', desc: 'The visit is scheduled and added to the queue.' },
  { icon: Stethoscope, title: 'Doctor Consultation', desc: 'The doctor records notes and writes a prescription.' },
  { icon: FlaskConical, title: 'Laboratory / Pharmacy', desc: 'Lab processes the test, or pharmacy dispenses the medicine.' },
  { icon: Receipt, title: 'Billing and Reports', desc: 'Billing is recorded and reports stay with the visit.' },
];

export default function Workflow() {
  return (
    <section id="workflow" className="landing-workflow">
      <div className="landing-container">
        <Reveal className="landing-workflow__header">
          <span className="landing-badge">How it works</span>
          <h2 className="landing-section-title">From registration to billing</h2>
          <p className="landing-section-sub">
            The path a visit can take through the workspaces that are already in SaffoCare.
          </p>
        </Reveal>
        <ol className="landing-workflow__steps">
          {STEPS.map((step, index) => (
            <Reveal key={step.title} as="li" className="landing-workflow__step" delay={index * 0.06}>
              <div className="landing-workflow__icon">
                <step.icon size={20} aria-hidden />
                <span>{index + 1}</span>
              </div>
              <h3>{step.title}</h3>
              <p>{step.desc}</p>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}

import {
  CalendarClock,
  ClipboardPen,
  FlaskConical,
  Pill,
  Receipt,
  Users,
} from 'lucide-react';
import Reveal from './Reveal';
import './Features.css';

const FEATURES = [
  {
    icon: Users,
    title: 'Patient Management',
    desc: 'Register patients and keep visit details available to the teams who need them.',
  },
  {
    icon: CalendarClock,
    title: 'Appointment Scheduling',
    desc: 'Book OPD visits and keep the front-desk queue moving through the day.',
  },
  {
    icon: ClipboardPen,
    title: 'Clinical Documentation',
    desc: 'Record diagnosis notes, treatment plans, and prescriptions in the doctor workspace.',
  },
  {
    icon: Pill,
    title: 'Pharmacy Management',
    desc: 'Review prescriptions, track medicine stock, and record pharmacy sales.',
  },
  {
    icon: FlaskConical,
    title: 'Laboratory Management',
    desc: 'Order tests, mark samples collected, and upload completed laboratory reports.',
  },
  {
    icon: Receipt,
    title: 'Billing and Hospital Analytics',
    desc: 'Handle OPD and IPD billing, and review hospital activity from admin reports.',
  },
];

export default function Features() {
  return (
    <section id="features" className="landing-features">
      <div className="landing-container">
        <Reveal className="landing-features__header">
          <span className="landing-badge">Features</span>
          <h2 className="landing-section-title">Everything Your Hospital Needs. In One Place.</h2>
        </Reveal>
        <div className="landing-features__grid">
          {FEATURES.map((feature, index) => (
            <Reveal key={feature.title} className="landing-features__card landing-card" delay={index * 0.05}>
              <span className="landing-features__icon">
                <feature.icon size={20} aria-hidden />
              </span>
              <h3>{feature.title}</h3>
              <p>{feature.desc}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

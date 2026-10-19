import { Eye, Layers3, MonitorSmartphone, Network, ShieldCheck, Workflow } from 'lucide-react';
import Reveal from './Reveal';
import './WhyUs.css';

const POINTS = [
  {
    icon: Layers3,
    title: 'One platform',
    text: 'OPD, doctors, nurses, lab, pharmacy, reception, and admin work in the same system.',
  },
  {
    icon: ShieldCheck,
    title: 'Role-based workspaces',
    text: 'Each sign-in opens the screens that belong to that role.',
  },
  {
    icon: Network,
    title: 'Easier coordination',
    text: 'A prescription, lab order, or queue update is visible to the next team.',
  },
  {
    icon: Workflow,
    title: 'Organized visits',
    text: 'Registration, clinical notes, and prescriptions stay attached to the patient visit.',
  },
  {
    icon: Eye,
    title: 'Operational visibility',
    text: 'Admin reports and department queues show what is waiting today.',
  },
  {
    icon: MonitorSmartphone,
    title: 'Desktop and mobile',
    text: 'The same workspaces stay usable on a desk and on a smaller screen.',
  },
];

export default function WhyUs() {
  return (
    <section id="why" className="landing-why">
      <div className="landing-container">
        <Reveal className="landing-why__header">
          <span className="landing-badge">Why SaffoCare</span>
          <h2 className="landing-section-title">Why choose SaffoCare?</h2>
        </Reveal>
        <div className="landing-why__grid">
          {POINTS.map((point, index) => (
            <Reveal key={point.title} className="landing-why__card" delay={index * 0.04}>
              <span className="landing-why__icon">
                <point.icon size={18} aria-hidden />
              </span>
              <h3>{point.title}</h3>
              <p>{point.text}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

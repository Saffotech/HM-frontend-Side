import {
  Activity,
  Baby,
  Brain,
  HeartPulse,
  Microscope,
  Pill,
  Stethoscope,
  Syringe,
} from 'lucide-react';
import './TrustedBy.css';

const DEPARTMENTS = [
  { icon: HeartPulse, name: 'Cardiology' },
  { icon: Brain, name: 'Neurology' },
  { icon: Baby, name: 'Pediatrics' },
  { icon: Stethoscope, name: 'General Medicine' },
  { icon: Microscope, name: 'Laboratory' },
  { icon: Pill, name: 'Pharmacy' },
  { icon: Syringe, name: 'Vaccination' },
  { icon: Activity, name: 'Emergency' },
];

export default function TrustedBy() {
  return (
    <section className="landing-trusted">
      <div className="landing-container">
        <p className="landing-trusted__label">Trusted across every hospital department</p>
        <div className="landing-trusted__grid">
          {DEPARTMENTS.map(({ icon: Icon, name }) => (
            <div key={name} className="landing-trusted__item">
              <Icon size={24} aria-hidden />
              <span>{name}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

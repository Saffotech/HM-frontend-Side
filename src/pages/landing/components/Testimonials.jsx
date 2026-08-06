import {
  Building2,
  ClipboardList,
  FlaskConical,
  HeartPulse,
  Pill,
  Shield,
  Stethoscope,
  UserCog,
} from 'lucide-react';
import './Testimonials.css';

/** Role highlights — honest alternative to fake testimonials until real reviews exist. */
const ROLES = [
  {
    icon: Shield,
    role: 'Super Admin',
    text: 'Hospital-wide control — users, roles, and system configuration in one place.',
  },
  {
    icon: UserCog,
    role: 'Admin',
    text: 'Manage staff, departments, settings, and day-to-day hospital operations.',
  },
  {
    icon: ClipboardList,
    role: 'OPD',
    text: 'Register patients, book appointments, manage beds, and handle billing & payments.',
  },
  {
    icon: Stethoscope,
    role: 'Doctor',
    text: 'View patient history, write prescriptions, and manage consultations faster.',
  },
  {
    icon: HeartPulse,
    role: 'Nurse',
    text: 'Record vitals, nursing notes, medications, and keep the patient queue updated.',
  },
  {
    icon: FlaskConical,
    role: 'Lab',
    text: 'Track samples, upload reports, and keep test results ready for clinicians.',
  },
  {
    icon: Building2,
    role: 'Receptionist',
    text: 'Guide patients and support queue flow — without OPD registration or billing permissions.',
  },
  {
    icon: Pill,
    role: 'Pharmacy',
    text: 'Dispense medicines, manage stock, and fulfill prescriptions accurately.',
  },
];

export default function Testimonials() {
  return (
    <section id="testimonials" className="landing-testimonials">
      <div className="landing-container">
        <div className="landing-testimonials__header">
          <h2 className="landing-section-title">Built for Every Hospital Role</h2>
          <p className="landing-section-sub">
            Each team gets the tools they need — from front desk to pharmacy — in one system.
          </p>
        </div>
        <div className="landing-testimonials__grid">
          {ROLES.map((item) => (
            <div key={item.role} className="landing-testimonials__card landing-card">
              <span className="landing-testimonials__icon">
                <item.icon size={20} aria-hidden />
              </span>
              <h3 className="landing-testimonials__name">{item.role}</h3>
              <p className="landing-testimonials__text">{item.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

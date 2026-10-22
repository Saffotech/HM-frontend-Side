import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Building2,
  ClipboardList,
  FlaskConical,
  HeartPulse,
  Pill,
  Stethoscope,
  UserCog,
  UserRound,
} from 'lucide-react';
import { ROUTES } from '@/shared/constants';
import './Modules.css';

const MODULES = [
  {
    icon: UserCog,
    title: 'Admin Module',
    items: ['User management', 'Role permissions', 'Hospital analytics', 'System settings'],
    to: ROUTES.LOGIN,
    cta: 'Open Admin Login',
  },
  {
    icon: Stethoscope,
    title: 'Doctor Module',
    items: ['Patient records', 'Prescriptions', 'Diagnosis notes', 'Treatment plans'],
    to: ROUTES.LOGIN,
    cta: 'Doctor Login',
  },
  {
    icon: Building2,
    title: 'Reception Module',
    items: ['Patient guidance', 'Queue support', 'Doctor queue visibility'],
    to: ROUTES.LOGIN,
    cta: 'Reception Login',
  },
  {
    icon: Pill,
    title: 'Pharmacy Module',
    items: ['Medicine stock', 'Prescription management', 'Sales management'],
    to: ROUTES.PHARMACY_LOGIN,
    cta: 'Pharmacy Login',
  },
  {
    icon: FlaskConical,
    title: 'Laboratory Module',
    items: ['Test management', 'Report uploads', 'Sample tracking'],
    to: ROUTES.LOGIN,
    cta: 'Lab Login',
  },
  {
    icon: ClipboardList,
    title: 'OPD Module',
    items: ['Patient registration', 'Appointments', 'Billing & payments', 'Bed management'],
    to: ROUTES.LOGIN,
    cta: 'OPD Login',
  },
  {
    icon: HeartPulse,
    title: 'Nurse Module',
    items: ['Vitals recording', 'Nursing notes', 'Medication admin', 'Patient queue'],
    to: ROUTES.LOGIN,
    cta: 'Nurse Login',
  },
  {
    icon: UserRound,
    title: 'Patient Portal',
    items: ['View reports', 'Appointment booking', 'Billing & prescription history'],
    to: ROUTES.PATIENT_LOGIN,
    cta: 'Patient Login',
    disabled: true,
  },
];

export default function Modules() {
  return (
    <section id="modules" className="landing-modules">
      <div className="landing-container">
        <div className="landing-modules__header">
          <span className="landing-badge landing-badge--success">Modules</span>
          <h2 className="landing-section-title">Dedicated Modules for Your Hospital Departments</h2>
        </div>
        <div className="landing-modules__grid">
          {MODULES.map((m) => {
            const content = (
              <>
                <div className="landing-modules__card-head">
                  <span className="landing-modules__icon">
                    <m.icon size={24} aria-hidden />
                  </span>
                  <h3>{m.title}</h3>
                </div>
                <ul>
                  {m.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
                <span className="landing-modules__cta">
                  {m.disabled ? 'Coming Soon' : m.cta}{' '}
                  {!m.disabled ? <ArrowRight size={16} aria-hidden /> : null}
                </span>
              </>
            );

            if (m.disabled) {
              return (
                <div
                  key={m.title}
                  className="landing-modules__card landing-card landing-modules__card--disabled"
                  title="Patient login is temporarily unavailable"
                  aria-disabled="true"
                >
                  {content}
                </div>
              );
            }

            return (
              <Link key={m.title} to={m.to} className="landing-modules__card landing-card">
                {content}
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}

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
import Reveal from './Reveal';
import './Modules.css';

const STAFF_LOGIN = `${ROUTES.LOGIN}?switch=1`;

const MODULES = [
  {
    icon: UserCog,
    title: 'Admin Module',
    items: ['User management', 'Role permissions', 'Hospital analytics', 'System settings'],
    to: STAFF_LOGIN,
    cta: 'Open Admin Login',
  },
  {
    icon: Stethoscope,
    title: 'Doctor Module',
    items: ['Patient records', 'Prescriptions', 'Diagnosis notes', 'Treatment plans'],
    to: STAFF_LOGIN,
    cta: 'Doctor Login',
  },
  {
    icon: Building2,
    title: 'Reception Module',
    items: ['Patient guidance', 'Queue management', 'Doctor availability'],
    to: STAFF_LOGIN,
    cta: 'Reception Login',
  },
  {
    icon: Pill,
    title: 'Pharmacy Module',
    items: ['Medicine stock', 'Prescription management', 'Sales management'],
    to: STAFF_LOGIN,
    cta: 'Pharmacy Login',
  },
  {
    icon: FlaskConical,
    title: 'Laboratory Module',
    items: ['Test management', 'Report uploads', 'Sample tracking'],
    to: STAFF_LOGIN,
    cta: 'Lab Login',
  },
  {
    icon: ClipboardList,
    title: 'OPD Module',
    items: ['Patient registration', 'Appointments', 'Billing and payments'],
    to: STAFF_LOGIN,
    cta: 'OPD Login',
  },
  {
    icon: HeartPulse,
    title: 'Nurse Module',
    items: ['Vitals recording', 'Nursing notes', 'Medication administration', 'Patient queue'],
    to: STAFF_LOGIN,
    cta: 'Nurse Login',
  },
  {
    icon: UserRound,
    title: 'Patient Portal',
    items: ['View reports', 'Appointment booking', 'Billing and prescription history'],
    cta: 'Patient Login',
    disabled: true,
  },
];

export default function Modules() {
  return (
    <section id="modules" className="landing-modules">
      <span id="roles" className="landing-modules__anchor" />
      <div className="landing-container">
        <Reveal className="landing-modules__header">
          <span className="landing-badge">Modules</span>
          <h2 className="landing-section-title">Dedicated workspaces for every hospital role</h2>
          <p className="landing-section-sub">
            Each card opens the login that already exists for that team. Patient access stays closed until that portal is ready.
          </p>
        </Reveal>
        <div className="landing-modules__grid">
          {MODULES.map((module, index) => {
            const content = (
              <>
                <span className="landing-modules__icon">
                  <module.icon size={22} aria-hidden />
                </span>
                <h3>{module.title}</h3>
                <ul>
                  {module.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
                <span className="landing-modules__cta">
                  {module.disabled ? 'Coming Soon' : module.cta}
                  {!module.disabled ? <ArrowRight size={15} aria-hidden /> : null}
                </span>
              </>
            );

            if (module.disabled) {
              return (
                <div
                  key={module.title}
                  className="landing-modules__card landing-card landing-modules__card--disabled"
                  title="Patient login is temporarily unavailable"
                  aria-disabled="true"
                >
                  {content}
                </div>
              );
            }

            return (
              <Reveal key={module.title} delay={index * 0.04}>
                <Link to={module.to} className="landing-modules__card landing-card">
                  {content}
                </Link>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

import { Link } from 'react-router-dom';
import {
  ArrowRight,
  ClipboardList,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Users,
} from 'lucide-react';
import { ROUTES } from '@/shared/constants';
import heroDashboard from '@/assets/hero-dashboard.png';
import './Hero.css';

const TRUST_ITEMS = [
  { icon: Users, label: '9 Staff Roles' },
  { icon: ClipboardList, label: 'OPD & IPD to Pharmacy' },
  { icon: ShieldCheck, label: 'Role-Based Access' },
];

export default function Hero() {
  return (
    <section id="home" className="landing-hero landing-bg-hero">
      <div className="landing-bg-grid landing-hero__grid-bg" aria-hidden />
      <div className="landing-hero__inner landing-container">
        <div className="landing-hero__content">
          <span className="landing-badge">
            <Sparkles size={14} aria-hidden /> All-in-one Hospital OS
          </span>
          <h1 className="landing-hero__title">
            Modern Hospital Management System for{' '}
            <span className="landing-text-gradient">Smart Healthcare Operations</span>
          </h1>
          <p className="landing-hero__lead">
            Manage patients, appointments, billing, clinical care, pharmacy, lab, and hospital
            operations from one secure platform.
          </p>
          <p className="landing-hero__sub">
            Built for a single hospital — with dedicated workspaces for Super Admin, Admin, OPD,
            Doctor, Nurse, Lab, Receptionist, and Pharmacy, each with the right permissions.
          </p>
          <div className="landing-hero__actions">
            <button
              type="button"
              className="landing-btn landing-btn--primary landing-btn--lg landing-btn--disabled"
              disabled
              title="Patient login is temporarily unavailable"
              aria-disabled="true"
            >
              Get Started <ArrowRight size={16} aria-hidden />
            </button>
            <Link to={`${ROUTES.LOGIN}?switch=1`} className="landing-btn landing-btn--ghost landing-btn--lg">
              Staff Login
            </Link>
            <Link to={ROUTES.ABOUT} className="landing-btn landing-btn--outline landing-btn--lg">
              About Us
            </Link>
          </div>
          <div className="landing-hero__trust">
            {TRUST_ITEMS.map(({ icon: Icon, label }) => (
              <div key={label} className="landing-hero__trust-item">
                <Icon size={16} className="landing-hero__trust-icon" aria-hidden />
                {label}
              </div>
            ))}
          </div>
        </div>

        <div className="landing-hero__visual">
          <div className="landing-hero__glow" aria-hidden />
          <div className="landing-hero__mockup landing-card">
            <img
              src={heroDashboard}
              alt="Hospital management dashboard preview"
              width={1280}
              height={960}
              className="landing-hero__image"
            />
            <div className="landing-hero__float landing-glass-card landing-animate-float">
              <div className="landing-hero__float-row">
                <span className="landing-hero__float-icon landing-hero__float-icon--success">
                  <Stethoscope size={20} aria-hidden />
                </span>
                <div>
                  <p className="landing-hero__float-label">Staff Roles</p>
                  <p className="landing-hero__float-value">9 Modules</p>
                </div>
              </div>
            </div>
            <div
              className="landing-hero__float landing-hero__float--right landing-glass-card landing-animate-float"
              style={{ animationDelay: '1.5s' }}
            >
              <p className="landing-hero__float-label">Hospital Coverage</p>
              <p className="landing-hero__float-value landing-hero__float-value--primary">OPD → Pharmacy</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

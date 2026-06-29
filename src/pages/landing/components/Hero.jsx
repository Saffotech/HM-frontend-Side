import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Calendar,
  PlayCircle,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Users,
} from 'lucide-react';
import { ROUTES } from '@/shared/constants';
import heroDashboard from '@/assets/hero-dashboard.png';
import './Hero.css';

const TRUST_ITEMS = [
  { icon: ShieldCheck, label: 'HIPAA-Ready' },
  { icon: Users, label: 'Multi-Role' },
  { icon: Calendar, label: '24/7 Support' },
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
            Manage patients, doctors, appointments, billing, pharmacy, medical records, staff, and
            hospital operations from one secure platform.
          </p>
          <p className="landing-hero__sub">
            A centralized platform designed for a single hospital to streamline every department —
            from reception to laboratory — with real-time insights and HIPAA-ready security.
          </p>
          <div className="landing-hero__actions">
            <Link to={ROUTES.PATIENT_LOGIN} className="landing-btn landing-btn--primary landing-btn--lg">
              Get Started <ArrowRight size={16} aria-hidden />
            </Link>
            <a href="#contact" className="landing-btn landing-btn--outline landing-btn--lg">
              <PlayCircle size={16} aria-hidden /> Book Demo
            </a>
            <Link to={`${ROUTES.LOGIN}?switch=1`} className="landing-btn landing-btn--ghost landing-btn--lg">
              Staff Login
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
                  <p className="landing-hero__float-label">Available Doctors</p>
                  <p className="landing-hero__float-value">52 Online</p>
                </div>
              </div>
            </div>
            <div
              className="landing-hero__float landing-hero__float--right landing-glass-card landing-animate-float"
              style={{ animationDelay: '1.5s' }}
            >
              <p className="landing-hero__float-label">Today&apos;s Appointments</p>
              <p className="landing-hero__float-value landing-hero__float-value--primary">128</p>
              <div className="landing-hero__chart">
                {[40, 70, 55, 85, 60, 90].map((h, i) => (
                  <span key={i} style={{ height: `${h / 4}px` }} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

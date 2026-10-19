import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import {
  ArrowRight,
  CalendarClock,
  FlaskConical,
  LayoutGrid,
  Pill,
  ShieldCheck,
  Stethoscope,
  Users,
} from 'lucide-react';
import { ROUTES } from '@/shared/constants';
import './Hero.css';

const TRUST_ITEMS = [
  { icon: Users, label: '8 Dedicated Roles' },
  { icon: LayoutGrid, label: 'Connected Hospital Workflows' },
  { icon: ShieldCheck, label: 'Role-Based Access' },
];

const QUEUE = [
  { time: '09:10', name: 'Morning clinic', meta: 'OPD · Dr. Mehta' },
  { time: '09:40', name: 'Follow-up visit', meta: 'OPD · Dr. Shah' },
  { time: '10:15', name: 'Lab review', meta: 'Laboratory' },
];

function scrollToSection(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  window.history.replaceState(null, '', `${ROUTES.HOME}#${id}`);
}

export default function Hero() {
  const reduce = useReducedMotion();
  const enter = reduce
    ? {}
    : {
        initial: { opacity: 0, y: 18 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
      };

  return (
    <section id="home" className="landing-hero landing-bg-hero">
      <div className="landing-bg-grid landing-hero__grid-bg" aria-hidden />
      <div className="landing-hero__inner landing-container">
        <motion.div className="landing-hero__content" {...enter}>
          <span className="landing-badge">One platform. Every hospital workflow.</span>
          <h1 className="landing-hero__title">
            One Hospital. <span className="landing-text-gradient">Every Workflow.</span> One Connected Platform.
          </h1>
          <p className="landing-hero__lead">
            Manage patients, appointments, clinical care, prescriptions, laboratory workflows,
            pharmacy, billing, and hospital operations from one secure, connected platform.
          </p>
          <p className="landing-hero__sub">
            Dedicated workspaces help each hospital team manage its own responsibilities, with
            access limited to the role they sign in with.
          </p>
          <div className="landing-hero__actions">
            <button
              type="button"
              className="landing-btn landing-btn--primary landing-btn--lg"
              onClick={() => scrollToSection('modules')}
            >
              Get Started <ArrowRight size={16} aria-hidden />
            </button>
            <Link to={`${ROUTES.LOGIN}?switch=1`} className="landing-btn landing-btn--outline landing-btn--lg">
              Staff Login
            </Link>
            <button
              type="button"
              className="landing-btn landing-btn--ghost landing-btn--lg"
              onClick={() => scrollToSection('features')}
            >
              Explore Features
            </button>
          </div>
          <div className="landing-hero__trust">
            {TRUST_ITEMS.map(({ icon: Icon, label }) => (
              <div key={label} className="landing-hero__trust-item">
                <Icon size={16} className="landing-hero__trust-icon" aria-hidden />
                {label}
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
          className="landing-hero__visual"
          {...(reduce
            ? {}
            : {
                initial: { opacity: 0, y: 22 },
                animate: { opacity: 1, y: 0 },
                transition: { duration: 0.6, delay: 0.08, ease: [0.22, 1, 0.36, 1] },
              })}
        >
          <div className="landing-hero__device" aria-hidden>
            <div className="landing-hero__chrome">
              <span />
              <span />
              <span />
              <p>SaffoCare · Hospital overview</p>
            </div>
            <div className="landing-hero__screen">
              <aside className="landing-hero__side">
                <strong>Today</strong>
                <span>Appointments</span>
                <span>Patient queue</span>
                <span>Doctors</span>
                <span>Pharmacy</span>
                <span>Laboratory</span>
                <span>Billing</span>
              </aside>
              <div className="landing-hero__dash">
                <div className="landing-hero__pills">
                  <div>
                    <CalendarClock size={14} />
                    <span>Appointments</span>
                    <em>Open</em>
                  </div>
                  <div>
                    <Users size={14} />
                    <span>Queue</span>
                    <em>Active</em>
                  </div>
                  <div>
                    <Stethoscope size={14} />
                    <span>Doctors</span>
                    <em>On duty</em>
                  </div>
                  <div>
                    <Pill size={14} />
                    <span>Pharmacy</span>
                    <em>Dispensing</em>
                  </div>
                </div>
                <ul className="landing-hero__list">
                  {QUEUE.map((row) => (
                    <li key={row.time}>
                      <b>{row.time}</b>
                      <span>
                        {row.name}
                        <small>{row.meta}</small>
                      </span>
                    </li>
                  ))}
                </ul>
                <div className="landing-hero__footrow">
                  <span>
                    <FlaskConical size={14} /> Lab reports in review
                  </span>
                  <span>Billing for today&apos;s visits</span>
                </div>
              </div>
            </div>
          </div>

          <div className="landing-hero__float landing-card landing-animate-float">
            <Users size={16} aria-hidden />
            <div>
              <p>Dedicated roles</p>
              <strong>8 workspaces</strong>
            </div>
          </div>
          <div
            className="landing-hero__float landing-hero__float--alt landing-card landing-animate-float"
            style={{ animationDelay: '1.2s' }}
          >
            <p>Connected flow</p>
            <strong>OPD → Pharmacy</strong>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

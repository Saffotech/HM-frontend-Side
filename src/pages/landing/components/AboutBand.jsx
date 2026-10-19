import { Link } from 'react-router-dom';
import { ROUTES } from '@/shared/constants';
import Reveal from './Reveal';
import './AboutBand.css';

export default function AboutBand() {
  return (
    <section className="landing-about" aria-labelledby="about-saffocare-title">
      <div className="landing-container landing-about__grid">
        <Reveal>
          <span className="landing-badge">About</span>
          <h2 id="about-saffocare-title" className="landing-section-title">
            About SaffoCare
          </h2>
          <p>
            SaffoCare helps a hospital run administrative and clinical work in dedicated workspaces
            that stay connected. OPD registration, doctor notes, nursing care, laboratory reports,
            pharmacy dispense, and billing do not have to live in separate tools.
          </p>
          <p>
            It is built by Saffo Tech in Navi Mumbai for day-to-day hospital operations, with a
            separate sign-in for each role.
          </p>
          <Link to={ROUTES.ABOUT} className="landing-btn landing-btn--outline">
            Read about us
          </Link>
        </Reveal>
        <Reveal className="landing-about__panel landing-card" delay={0.08}>
          <p className="landing-about__label">Workspaces in this build</p>
          <ul>
            <li>OPD registration, appointments, and billing</li>
            <li>Doctor records, notes, and prescriptions</li>
            <li>Nurse vitals, notes, and medication</li>
            <li>Laboratory orders and uploaded reports</li>
            <li>Pharmacy stock, prescriptions, and sales</li>
            <li>Admin staff, roles, and hospital reports</li>
          </ul>
        </Reveal>
      </div>
    </section>
  );
}

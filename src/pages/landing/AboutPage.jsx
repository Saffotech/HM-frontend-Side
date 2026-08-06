import { useEffect } from 'react';
import { Mail, MapPin, Phone } from 'lucide-react';
import { Navbar, Footer } from '@/pages/landing/components';
import '@/pages/landing/styles/landing-theme.css';
import './AboutPage.css';

export default function AboutPage() {
  useEffect(() => {
    document.title = 'About Us — SaffoCare Hospital Management System';
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="landing-page about-page">
      <Navbar />
      <main>
        <section className="about-hero landing-bg-hero">
          <div className="landing-bg-grid about-hero__grid" aria-hidden />
          <div className="landing-container about-hero__inner">
            <span className="landing-badge">About Us</span>
            <h1 className="about-hero__title">
              About SaffoCare
            </h1>
            <p className="about-hero__lead">
              SaffoCare is a modern Hospital Management System developed by Saffo Tech. It is built
              to help hospitals run daily operations from one secure platform — patients,
              appointments, billing, clinical care, lab, and pharmacy — with clear roles for every team.
            </p>
          </div>
        </section>

        <section className="about-section">
          <div className="landing-container about-section__narrow">
            <h2 className="landing-section-title">Our mission</h2>
            <p className="about-prose">
              Hospitals lose time when patient data, billing, and clinical work live in separate
              tools. SaffoCare brings those workflows together so staff can focus on care — not
              chasing paperwork between departments.
            </p>
            <p className="about-prose">
              We design for a single hospital environment: practical screens for daily work,
              role-based access for OPD, doctors, nurses, lab, pharmacy, and admin teams, and a
              clear separation of duties — for example, OPD handles registration and billing while
              Receptionist supports patient guidance and queues.
            </p>
          </div>
        </section>

        <section className="about-section about-section--muted">
          <div className="landing-container about-section__narrow">
            <h2 className="landing-section-title">Who we are</h2>
            <p className="about-prose">
              SaffoCare is developed by <strong>Saffo Tech</strong>, based in Navi Mumbai, India.
              We build practical healthcare software for hospitals that need reliable day-to-day
              operations — not just marketing demos.
            </p>
            <p className="about-prose">
              Our focus is a complete hospital workflow: from OPD registration and appointments to
              doctor consultations, nursing care, laboratory reports, and pharmacy dispense — all
              connected under one system with secure, role-based access.
            </p>
          </div>
        </section>

        <section className="about-section">
          <div className="landing-container about-section__narrow">
            <h2 className="landing-section-title">Contact</h2>
            <p className="about-prose">
              Reach out to learn more about SaffoCare or discuss deployment for your hospital.
            </p>
            <ul className="about-contact-list">
              <li>
                <MapPin size={18} aria-hidden />
                <span>Navi Mumbai, India</span>
              </li>
              <li>
                <Phone size={18} aria-hidden />
                <a href="tel:+912240163618">+91 22 40163618</a>
              </li>
              <li>
                <Mail size={18} aria-hidden />
                <a href="mailto:sales@saffotech.com">sales@saffotech.com</a>
              </li>
            </ul>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

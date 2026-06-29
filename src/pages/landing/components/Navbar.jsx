import { useState } from 'react';
import { Link } from 'react-router-dom';
import { HeartPulse, Menu, X } from 'lucide-react';
import { ROUTES } from '@/shared/constants';
import { BrandLogo, BrandName } from '@/shared/components/common';
import './Navbar.css';

const LINKS = [
  { href: '#home', label: 'Home' },
  { href: '#features', label: 'Features' },
  { href: '#modules', label: 'Modules' },
  { href: '#about', label: 'About' },
  { href: '#testimonials', label: 'Testimonials' },
  { href: '#contact', label: 'Contact' },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="landing-nav">
      <div className="landing-nav__inner landing-container">
        <Link to={ROUTES.HOME} className="landing-nav__brand">
          <BrandLogo size={32} className="landing-nav__logo-img" />
          <BrandName className="landing-nav__title" />
        </Link>

        <nav className="landing-nav__desktop" aria-label="Main">
          {LINKS.map((l) => (
            <a key={l.href} href={l.href} className="landing-nav__link">
              {l.label}
            </a>
          ))}
        </nav>

        <div className="landing-nav__actions">
          <Link to={ROUTES.PATIENT_LOGIN} className="landing-btn landing-btn--ghost landing-btn--sm">
            <HeartPulse size={16} aria-hidden /> Patient Login
          </Link>
          <Link to={`${ROUTES.LOGIN}?switch=1`} className="landing-btn landing-btn--outline landing-btn--sm">
            Staff Login
          </Link>
          <a href="#contact" className="landing-btn landing-btn--primary landing-btn--sm">
            Request Demo
          </a>
        </div>

        <button
          type="button"
          className="landing-nav__menu-btn"
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
          aria-expanded={open}
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {open && (
        <div className="landing-nav__mobile">
          <div className="landing-nav__mobile-inner landing-container">
            {LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="landing-nav__mobile-link"
                onClick={() => setOpen(false)}
              >
                {l.label}
              </a>
            ))}
            <div className="landing-nav__mobile-btns">
              <Link to={ROUTES.PATIENT_LOGIN} className="landing-btn landing-btn--outline" onClick={() => setOpen(false)}>
                Patient
              </Link>
              <Link to={`${ROUTES.LOGIN}?switch=1`} className="landing-btn landing-btn--outline" onClick={() => setOpen(false)}>
                Staff
              </Link>
            </div>
            <a href="#contact" className="landing-btn landing-btn--primary" onClick={() => setOpen(false)}>
              Request Demo
            </a>
          </div>
        </div>
      )}
    </header>
  );
}

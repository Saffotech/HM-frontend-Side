import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { HeartPulse, Menu, X } from 'lucide-react';
import { ROUTES } from '@/shared/constants';
import { BrandLogo, BrandName } from '@/shared/components/common';
import './Navbar.css';

function getLinks() {
  return [
    { to: ROUTES.HOME, label: 'Home', end: true },
    { to: `${ROUTES.HOME}#features`, label: 'Features' },
    { to: `${ROUTES.HOME}#modules`, label: 'Modules' },
    { to: ROUTES.ABOUT, label: 'About Us', end: true },
    { to: `${ROUTES.HOME}#testimonials`, label: 'Roles' },
    { to: `${ROUTES.HOME}#contact`, label: 'Contact Us' },
  ];
}

function NavItem({ item, className, onClick }) {
  const location = useLocation();
  const navigate = useNavigate();
  const isHash = item.to.includes('#');

  if (isHash) {
    const [path, hash] = item.to.split('#');
    const targetPath = path || ROUTES.HOME;

    return (
      <a
        href={item.to}
        className={className}
        onClick={(e) => {
          e.preventDefault();
          onClick?.();
          if (location.pathname === targetPath) {
            const el = document.getElementById(hash);
            if (el) {
              el.scrollIntoView({ behavior: 'smooth', block: 'start' });
              window.history.replaceState(null, '', `${targetPath}#${hash}`);
              return;
            }
          }
          navigate(`${targetPath}#${hash}`);
        }}
      >
        {item.label}
      </a>
    );
  }

  const active = item.end && location.pathname === item.to;
  return (
    <Link
      to={item.to}
      className={`${className}${active ? ` ${className}--active` : ''}`}
      onClick={onClick}
    >
      {item.label}
    </Link>
  );
}

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const links = getLinks();

  return (
    <header className="landing-nav">
      <div className="landing-nav__inner landing-container">
        <Link to={ROUTES.HOME} className="landing-nav__brand">
          <BrandLogo size={32} className="landing-nav__logo-img" />
          <BrandName className="landing-nav__title" />
        </Link>

        <nav className="landing-nav__desktop" aria-label="Main">
          {links.map((l) => (
            <NavItem key={l.label} item={l} className="landing-nav__link" />
          ))}
        </nav>

        <div className="landing-nav__actions">
          <button
            type="button"
            className="landing-btn landing-btn--ghost landing-btn--sm landing-btn--disabled"
            disabled
            title="Patient login is temporarily unavailable"
            aria-disabled="true"
          >
            <HeartPulse size={16} aria-hidden /> Patient Login
          </button>
          <Link to={`${ROUTES.LOGIN}?switch=1`} className="landing-btn landing-btn--outline landing-btn--sm">
            Staff Login
          </Link>
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
            {links.map((l) => (
              <NavItem
                key={l.label}
                item={l}
                className="landing-nav__mobile-link"
                onClick={() => setOpen(false)}
              />
            ))}
            <div className="landing-nav__mobile-btns">
              <button
                type="button"
                className="landing-btn landing-btn--outline landing-btn--disabled"
                disabled
                title="Patient login is temporarily unavailable"
                aria-disabled="true"
              >
                Patient
              </button>
              <Link to={`${ROUTES.LOGIN}?switch=1`} className="landing-btn landing-btn--outline" onClick={() => setOpen(false)}>
                Staff
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

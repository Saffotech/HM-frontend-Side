import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { ROUTES } from '@/shared/constants';
import { BrandLogo, BrandName, UserProfileMenu } from '@/shared/components/common';
import DoctorNotificationsBell from './DoctorNotificationsBell';
import DoctorEncounterModeToggle from './DoctorEncounterModeToggle';
import './DoctorShell.css';

const DOCTOR_HEADER_TITLE = 'Doctor';

export default function DoctorShell({
  title = DOCTOR_HEADER_TITLE,
  nav,
  active,
  onSelect,
  encounterMode,
  onEncounterModeChange,
  children,
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const onProfilePage = location.pathname === ROUTES.DOCTOR_PROFILE;
  const showEncounterToggle = typeof onEncounterModeChange === 'function';
  const dashboardHref = encounterMode
    ? `${ROUTES.DOCTOR_DASHBOARD}?mode=${encounterMode}`
    : ROUTES.DOCTOR_DASHBOARD;

  return (
    <div className="doctor-shell">
      <div className="doctor-shell__mobile-bar no-print">
        <Link to={dashboardHref} className="doctor-shell__brand doctor-shell__mobile-brand">
          <BrandLogo size={28} />
          <BrandName className="doctor-shell__mobile-brand-text" />
        </Link>
        <p className="doctor-shell__mobile-title">{DOCTOR_HEADER_TITLE}</p>
        <div className="doctor-shell__mobile-actions">
          {showEncounterToggle ? (
            <DoctorEncounterModeToggle
              className="doc-encounter-mode--compact"
              value={encounterMode}
              onChange={onEncounterModeChange}
            />
          ) : null}
          <DoctorNotificationsBell onViewAll={() => onSelect('notifications')} />
          <button type="button" className="doctor-shell__menu-btn" onClick={() => setMobileOpen(true)} aria-label="Open menu">
            <Menu size={22} />
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="doctor-shell__overlay no-print" onClick={() => setMobileOpen(false)} role="presentation" />
      )}

      <aside className={`doctor-shell__sidebar no-print ${mobileOpen ? 'doctor-shell__sidebar--open' : ''}`}>
        <div className="doctor-shell__sidebar-head">
          <Link to={dashboardHref} className="doctor-shell__brand">
            <BrandLogo size={32} />
            <BrandName className="brand-name--on-dark" />
          </Link>
          <button type="button" className="doctor-shell__close" onClick={() => setMobileOpen(false)} aria-label="Close">
            <X size={20} />
          </button>
        </div>
        <p className="doctor-shell__role-label">{title}</p>
        <nav className="doctor-shell__nav">
          {nav.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`doctor-shell__nav-btn ${active === item.id ? 'doctor-shell__nav-btn--active' : ''}`}
              onClick={() => {
                onSelect(item.id);
                setMobileOpen(false);
              }}
            >
              <span className="doctor-shell__nav-icon">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>
        <div className="doctor-shell__sidebar-foot">
          <UserProfileMenu
            className="user-profile-menu--sidebar"
            profileHref={ROUTES.DOCTOR_PROFILE}
            logoutMenuOnly={onProfilePage}
          />
        </div>
      </aside>

      <div className="doctor-shell__main">
        <header className="doctor-shell__header no-print">
          <div className="doctor-shell__header-start">
            <h1 className="doctor-shell__header-title">{DOCTOR_HEADER_TITLE}</h1>
            {showEncounterToggle ? (
              <DoctorEncounterModeToggle
                value={encounterMode}
                onChange={onEncounterModeChange}
              />
            ) : null}
          </div>
          <div className="doctor-shell__header-actions">
            <DoctorNotificationsBell onViewAll={() => onSelect('notifications')} />
            <UserProfileMenu
              profileHref={ROUTES.DOCTOR_PROFILE}
              logoutMenuOnly={onProfilePage}
            />
          </div>
        </header>
        <div className={`doctor-shell__content${active === 'dashboard' ? ' doctor-shell__content--dashboard' : ''}`}>
          {children}
        </div>
      </div>
    </div>
  );
}

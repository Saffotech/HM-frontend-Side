import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { ROUTES } from '@/shared/constants';
import { BrandLogo, BrandName, UserProfileMenu } from '@/shared/components/common';
import DoctorNotificationsBell from './DoctorNotificationsBell';
import './DoctorShell.css';

export default function DoctorShell({ title, nav, active, onSelect, children }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  // Doctor Phase 2 by Atharva — header title for sections not listed in sidebar (bell → notifications)
  const sectionLabels = { notifications: 'Notifications', profile: 'My Profile' };
  const activeLabel =
    nav.find((n) => n.id === active)?.label ?? sectionLabels[active] ?? title;

  // Doctor Phase 2 by Atharva — on profile page, name click shows logout; elsewhere opens profile
  const onProfilePage = location.pathname === ROUTES.DOCTOR_PROFILE;

  return (
    <div className="doctor-shell">
      <div className="doctor-shell__mobile-bar no-print">
        <Link to={ROUTES.DOCTOR_DASHBOARD} className="doctor-shell__brand doctor-shell__mobile-brand">
          <BrandLogo size={28} />
          <BrandName className="doctor-shell__mobile-brand-text" />
        </Link>
        <p className="doctor-shell__mobile-title">{activeLabel}</p>
        <div className="doctor-shell__mobile-actions">
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
          <Link to={ROUTES.DOCTOR_DASHBOARD} className="doctor-shell__brand">
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
          <div>
            <h1 className="doctor-shell__header-title">{activeLabel}</h1>
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

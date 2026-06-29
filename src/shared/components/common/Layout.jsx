import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Home,
  Users,
  Calendar,
  CreditCard,
  Receipt,
  BedDouble,
  Menu,
  X,
  Bell,
  History,
} from 'lucide-react';
import { useMemo } from 'react';
import { ROUTES } from '@/shared/constants';
import { ACTIONS, canAccessAction } from '@/hooks/permissions';
import { useAuth } from '@/shared/hooks/useAuth';
import BrandLogo from './BrandLogo';
import BrandName from './BrandName';
import UserProfileMenu from './UserProfileMenu';
import './Layout.css';

const NAV_LINKS = [
  { href: ROUTES.DASHBOARD, label: 'Dashboard', icon: Home, permission: ACTIONS.VIEW_OPD_DASHBOARD },
  { href: ROUTES.BILLING, label: 'Billing', icon: CreditCard, permission: ACTIONS.VIEW_BILLING },
  { href: ROUTES.APPOINTMENTS, label: 'Appointments', icon: Calendar, permission: ACTIONS.MANAGE_APPOINTMENTS },
  { href: ROUTES.PATIENTS, label: 'Patient Management', icon: Users, permission: ACTIONS.MANAGE_PATIENTS },
  { href: ROUTES.BILLING_OPD_NEW, label: 'Generate Bill', icon: Receipt, permission: ACTIONS.CREATE_BILL },
  { href: ROUTES.BEDS, label: 'Bed Management', icon: BedDouble, permission: ACTIONS.MANAGE_BEDS },
  { href: ROUTES.PAYMENT_HISTORY, label: 'Payment History', icon: History, permission: ACTIONS.VIEW_PAYMENT_HISTORY },
];

const PAGE_TITLES = [
  { prefix: ROUTES.BILLING_OPD_NEW, title: 'Generate Bill' },
  { prefix: ROUTES.DASHBOARD, title: 'Dashboard' },
  { prefix: ROUTES.PATIENTS, title: 'Patient Management' },
  { prefix: ROUTES.APPOINTMENTS, title: 'Appointments' },
  { prefix: ROUTES.BILLING, title: 'Billing & Payments' },
  { prefix: ROUTES.BEDS, title: 'Bed Management' },
  { prefix: ROUTES.PAYMENT_HISTORY, title: 'Payment History' },
];

export default function Layout({ children }) {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [title, setTitle] = useState('Dashboard');

  const navLinks = useMemo(
    () => NAV_LINKS.filter((link) => canAccessAction(user, link.permission)),
    [user]
  );

  useEffect(() => {
    const match = PAGE_TITLES.find((p) => pathname.startsWith(p.prefix));
    setTitle(match?.title || 'Dashboard');
    setSidebarOpen(false);
  }, [pathname]);

  const today = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  return (
    <div className="layout">
      <div className="layout-mobile-bar no-print">
        <Link to={ROUTES.APP_ENTRY} className="layout-brand layout-mobile-bar__brand">
          <BrandLogo size={28} />
          <BrandName className="layout-mobile-bar__brand-text" />
        </Link>
        <h1 className="layout-mobile-bar__title">{title}</h1>
        <button
          type="button"
          className="layout-menu-btn"
          onClick={() => setSidebarOpen(true)}
          aria-label="Open menu"
        >
          <Menu size={24} />
        </button>
      </div>

      {sidebarOpen && (
        <div
          className="layout-overlay no-print"
          onClick={() => setSidebarOpen(false)}
          role="presentation"
        />
      )}

      <aside className={`layout-sidebar no-print ${sidebarOpen ? 'layout-sidebar--open' : ''}`}>
        <div className="layout-sidebar__head">
          <Link to={ROUTES.APP_ENTRY} className="layout-brand">
            <BrandLogo size={32} />
            <BrandName />
          </Link>
          <button
            type="button"
            className="layout-sidebar__close"
            onClick={() => setSidebarOpen(false)}
          >
            <X size={20} />
          </button>
        </div>

        <nav className="layout-nav">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const active =
              pathname === link.href ||
              (link.href !== ROUTES.DASHBOARD &&
                link.href !== ROUTES.BILLING_OPD_NEW &&
                pathname.startsWith(link.href));
            return (
              <Link
                key={link.href}
                to={link.href}
                className={`layout-nav__link ${active ? 'layout-nav__link--active' : ''}`}
              >
                <Icon size={22} />
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="layout-sidebar__user">
          <UserProfileMenu className="user-profile-menu--sidebar" />
        </div>
      </aside>

      <div className="layout-main">
        <header className="layout-header no-print">
          <h1 className="layout-header__title">{title}</h1>
          <div className="layout-header__actions">
            <span className="layout-header__date">{today}</span>
            <button type="button" className="layout-header__bell" aria-label="Notifications">
              <Bell size={20} />
              <span className="layout-header__bell-dot" />
            </button>
            <UserProfileMenu />
          </div>
        </header>

        <main className="layout-content">{children}</main>
      </div>
    </div>
  );
}

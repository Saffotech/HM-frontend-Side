import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, Bell, FlaskConical } from 'lucide-react';
import { BrandLogo, BrandName, UserProfileMenu } from '@/shared/components/common';
import '@/shared/components/common/Layout.css';

function defaultIsNavLinkActive(pathname, link, homeRoute) {
  return (
    pathname === link.href ||
    (link.href !== homeRoute && pathname.startsWith(link.href))
  );
}

function StandardRoleLayout({
  navLinks,
  resolveTitle,
  homeRoute,
  roleLabel,
  roleLabelClassName,
  children,
  compact = false,
  pageTitleOverride,
  defaultTitle,
  isNavLinkActive,
  showBell = true,
}) {
  const { pathname } = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [title, setTitle] = useState(defaultTitle);

  useEffect(() => {
    setTitle(resolveTitle(pathname, pageTitleOverride));
    setSidebarOpen(false);
  }, [pathname, pageTitleOverride, resolveTitle]);

  const today = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const getLinkActive = (link) =>
    isNavLinkActive
      ? isNavLinkActive(pathname, link)
      : defaultIsNavLinkActive(pathname, link, homeRoute);

  return (
    <div className="layout">
      <div className="layout-mobile-bar no-print">
        <Link to={homeRoute} className="layout-brand layout-mobile-bar__brand">
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
          <Link to={homeRoute} className="layout-brand">
            <BrandLogo size={32} />
            <BrandName />
          </Link>
          <button
            type="button"
            className="layout-sidebar__close"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>

        {roleLabel && (
          <p className={roleLabelClassName}>{roleLabel}</p>
        )}

        <nav className="layout-nav">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const active = getLinkActive(link);
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
            {showBell && (
              <button type="button" className="layout-header__bell" aria-label="Notifications">
                <Bell size={20} />
              </button>
            )}
            <UserProfileMenu />
          </div>
        </header>

        <main className={`layout-content${compact ? ' layout-content--compact' : ''}`}>
          {children}
        </main>
      </div>
    </div>
  );
}

function LabRoleLayout({
  navLinks,
  resolveTitle,
  homeRoute,
  roleLabel,
  children,
  pageTitleOverride,
  isNavLinkActive,
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { pathname } = useLocation();
  const pageTitle = resolveTitle(pathname, pageTitleOverride);

  const closeSidebar = () => setSidebarOpen(false);

  const getLinkActive = (link) =>
    isNavLinkActive
      ? isNavLinkActive(pathname, link)
      : defaultIsNavLinkActive(pathname, link, homeRoute);

  return (
    <div className="lab-shell">
      <div className="lab-topbar no-print">
        <button
          type="button"
          className="lab-menu-btn"
          onClick={() => setSidebarOpen((o) => !o)}
          aria-label="Toggle sidebar"
        >
          <Menu size={18} />
        </button>
        <span className="lab-topbar-title">
          <FlaskConical size={16} aria-hidden /> {pageTitle}
        </span>
      </div>

      {sidebarOpen && (
        <div className="lab-overlay open" onClick={closeSidebar} role="presentation" />
      )}

      <aside className={`lab-sidebar no-print ${sidebarOpen ? 'open' : ''}`}>
        <div className="lab-sidebar-brand">
          <BrandLogo size={32} className="lab-sidebar-brand__logo" />
          <div className="brand-text">
            <h2>
              <BrandName variant="on-dark" />
            </h2>
            {roleLabel && <span>{roleLabel}</span>}
          </div>
          <button
            type="button"
            className="lab-menu-btn"
            onClick={closeSidebar}
            aria-label="Close menu"
            style={{ marginLeft: 'auto' }}
          >
            <X size={18} />
          </button>
        </div>

        <nav>
          <ul className="lab-nav">
            <li className="lab-nav-section">Navigation</li>
            {navLinks.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    to={item.href}
                    className={`lab-nav-item ${getLinkActive(item) ? 'active' : ''}`}
                    onClick={closeSidebar}
                  >
                    <Icon className="nav-icon" size={18} aria-hidden />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="lab-sidebar-footer">
          <UserProfileMenu className="user-profile-menu--sidebar" />
        </div>
      </aside>

      <main className="lab-main">{children}</main>
    </div>
  );
}

export default function RoleLayout({
  navLinks,
  resolveTitle,
  homeRoute,
  roleLabel,
  roleLabelClassName,
  children,
  compact = false,
  pageTitleOverride,
  defaultTitle = '',
  isNavLinkActive,
  showBell = true,
  variant = 'standard',
}) {
  if (variant === 'lab') {
    return (
      <LabRoleLayout
        navLinks={navLinks}
        resolveTitle={resolveTitle}
        homeRoute={homeRoute}
        roleLabel={roleLabel}
        pageTitleOverride={pageTitleOverride}
        isNavLinkActive={isNavLinkActive}
      >
        {children}
      </LabRoleLayout>
    );
  }

  return (
    <StandardRoleLayout
      navLinks={navLinks}
      resolveTitle={resolveTitle}
      homeRoute={homeRoute}
      roleLabel={roleLabel}
      roleLabelClassName={roleLabelClassName}
      compact={compact}
      pageTitleOverride={pageTitleOverride}
      defaultTitle={defaultTitle}
      isNavLinkActive={isNavLinkActive}
      showBell={showBell}
    >
      {children}
    </StandardRoleLayout>
  );
}

import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { LogOut, Menu, X } from "lucide-react";
import logo from "../assets/images/logo.svg";
import { portalSessionIsAuthenticated } from "../api/platformSession";
import { usePlatform } from "../context/PlatformContext";
import useLogoutConfirmation from "@/shared/hooks/useLogoutConfirmation";
import PortalEntryFallback from "./PortalEntryFallback";
import AvatarImage from "./profile/AvatarImage";
import "../layout/AppShell.css";
import "../layout/Sidebar.css";
import "../layout/Header.css";
import "./PortalLayout.css";

export default function PortalLayout({
  portal,
  name,
  profilePath,
  items,
  titles,
  className = "",
  headerLeft = null,
  headerExtra = null,
  showLogout = true,
}) {
  const { sessionFor, signOutPortal, portalProfile } = usePlatform();
  const logoutConfirmation = useLogoutConfirmation(() => signOutPortal(portal));
  const session = sessionFor(portal);
  const { pathname } = useLocation();
  const [navOpen, setNavOpen] = useState(false);
  const [seenPath, setSeenPath] = useState(pathname);
  if (seenPath !== pathname) {
    setSeenPath(pathname);
    setNavOpen(false);
  }

  useEffect(() => {
    if (!navOpen) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event) => {
      if (event.key === "Escape") setNavOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKey);
    };
  }, [navOpen]);

  // Keys ending in "/" title every page below that path.
  const title = titles[pathname]
    || Object.entries(titles).find(([path]) => path.endsWith("/") && pathname.startsWith(path))?.[1]
    || name;

  if (!portalSessionIsAuthenticated(portal, session)) return <PortalEntryFallback portal={portal} />;
  const photo = portalProfile(portal)?.photoUrl || "";
  const user = (
    <>
      <span className="avatar" aria-hidden="true"><AvatarImage photo={photo} name={session.name} /></span>
      <span className="user-meta">
        <strong>{session.name}</strong>
        <span>{session.role}</span>
      </span>
    </>
  );

  return (
    <div className={`app-shell portal-shell ${className}${navOpen ? " is-nav-open" : ""}`}>
      <aside className="sidebar" aria-label={`${name} navigation`}>
        <div className="brand">
          <img src={logo} alt="" />
          <div>
            <strong>SaffoCare</strong>
            <span>{name}</span>
          </div>
          <button type="button" className="icon-btn sidebar-close" onClick={() => setNavOpen(false)} aria-label="Close navigation">
            <X size={18} aria-hidden="true" />
          </button>
        </div>
        <div className="sidebar-scroll">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
                onClick={() => setNavOpen(false)}
              >
                <Icon size={16} aria-hidden="true" />
                <span className="nav-label">{item.label}</span>
                {item.badge ? <span className="portal-nav-badge" aria-label={`${item.badge} waiting`}>{item.badge}</span> : null}
              </NavLink>
            );
          })}
        </div>
      </aside>
      <button type="button" className="nav-backdrop" aria-label="Close navigation" onClick={() => setNavOpen(false)} />
      <div className="main-column">
        <header className="header">
          <div className="header-left">
            <button type="button" className="icon-btn nav-toggle" aria-label="Open navigation" aria-expanded={navOpen} onClick={() => setNavOpen(true)}>
              <Menu size={18} aria-hidden="true" />
            </button>
            {headerLeft || <h1 className="portal-title">{title}</h1>}
          </div>
          <div className="header-right">
            {headerExtra}
            {profilePath ? (
              <Link to={profilePath} className="portal-user-link" aria-label={`Open my profile (${session.name})`}>
                {user}
              </Link>
            ) : user}
            {showLogout ? (
              <button type="button" className="portal-logout" aria-label="Logout" onClick={logoutConfirmation.requestLogout}>
                <LogOut size={16} aria-hidden="true" />
                <span className="portal-logout-label">Logout</span>
              </button>
            ) : null}
          </div>
        </header>
        {showLogout ? logoutConfirmation.dialog : null}
        <div className="content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}

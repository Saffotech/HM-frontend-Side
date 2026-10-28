import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { LogOut } from "lucide-react";
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

export default function PortalLayout({ portal, name, profilePath, items, titles, className = "" }) {
  const { sessionFor, signOutPortal, portalProfile } = usePlatform();
  const logoutConfirmation = useLogoutConfirmation(() => signOutPortal(portal));
  const session = sessionFor(portal);
  const { pathname } = useLocation();
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
    <div className={`app-shell portal-shell ${className}`}>
      <aside className="sidebar" aria-label={`${name} navigation`}>
        <div className="brand">
          <img src={logo} alt="" />
          <div>
            <strong>SaffoCare</strong>
            <span>{name}</span>
          </div>
        </div>
        <div className="sidebar-scroll">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}>
                <Icon size={16} aria-hidden="true" />
                {item.label}
                {item.badge ? <span className="portal-nav-badge" aria-label={`${item.badge} waiting`}>{item.badge}</span> : null}
              </NavLink>
            );
          })}
        </div>
      </aside>
      <div className="main-column">
        <header className="header">
          <strong className="portal-title">{title}</strong>
          <div className="header-right">
            {profilePath ? (
              <Link to={profilePath} className="portal-user-link" aria-label={`Open my profile (${session.name})`}>
                {user}
              </Link>
            ) : user}
            <button type="button" className="portal-logout" aria-label="Logout" onClick={logoutConfirmation.requestLogout}>
              <LogOut size={16} aria-hidden="true" />
              <span className="portal-logout-label">Logout</span>
            </button>
          </div>
        </header>
        {logoutConfirmation.dialog}
        <div className="content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}

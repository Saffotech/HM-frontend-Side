import { useEffect, useMemo, useRef, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import {
  BadgeCheck,
  Bell,
  CalendarCheck,
  ChevronDown,
  LayoutDashboard,
  LogOut,
  Menu,
  Search,
  TrendingUp,
  UserRound,
  Users,
  X,
} from "lucide-react";
import logo from "../../shared/assets/images/logo.svg";
import { portalSessionIsAuthenticated } from "../../shared/api/platformSession";
import { usePlatform } from "../../shared/context/PlatformContext";
import { CRM_BASE, crmPath } from "../../shared/paths";
import PortalEntryFallback from "../../shared/portal/PortalEntryFallback";
import { formatDate } from "../../shared/utils/formatDate";
import { localDay, shiftDays } from "../../shared/utils/periods";
import { includesQuery } from "../../shared/utils/table";
import useLogoutConfirmation from "@/shared/hooks/useLogoutConfirmation";
import AvatarImage from "../../shared/portal/profile/AvatarImage";
import { StatusMark } from "./components/CrmMarks";
import ErrorBoundary from "./components/ErrorBoundary";
import { followBucket, plural } from "./utils/crmLeads";
import CrmWorkspace from "./workspace/CrmWorkspace";
import { useCrm } from "./workspace/workspace-context";
import "./components/crm.css";
import "./CrmLayout.css";

const NAV = [
  { to: CRM_BASE, label: "My Dashboard", icon: LayoutDashboard, end: true },
  { to: crmPath("/leads"), label: "My Leads", icon: Users, badge: "pool" },
  { to: crmPath("/follow-ups"), label: "Follow-ups & Tasks", icon: CalendarCheck, badge: "due" },
  { to: crmPath("/conversions"), label: "My Conversions", icon: BadgeCheck },
  { to: crmPath("/performance"), label: "My Performance", icon: TrendingUp },
  { to: crmPath("/profile"), label: "Profile", icon: UserRound },
];

export default function CrmLayout() {
  const { sessionFor } = usePlatform();
  const session = sessionFor("crm");
  if (!portalSessionIsAuthenticated("crm", session)) return <PortalEntryFallback portal="crm" />;
  return (
    <CrmWorkspace>
      <CrmShell session={session} />
    </CrmWorkspace>
  );
}

function CrmShell({ session }) {
  const { signOutPortal, portalProfile } = usePlatform();
  const logoutConfirmation = useLogoutConfirmation(() => signOutPortal("crm"));
  const photo = portalProfile("crm")?.photoUrl || "";
  const { leads, pool, today, actions } = useCrm();
  const { pathname } = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [seenPath, setSeenPath] = useState(pathname);
  const [menu, setMenu] = useState("");
  const [query, setQuery] = useState("");
  const menusRef = useRef(null);
  const searchRef = useRef(null);

  if (seenPath !== pathname) {
    setSeenPath(pathname);
    setMobileOpen(false);
    setMenu("");
  }

  useEffect(() => {
    const close = (event) => {
      if (menusRef.current && !menusRef.current.contains(event.target)) setMenu("");
    };
    const onKey = (event) => {
      const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName || "");
      if (event.key === "/" && !typing && !document.querySelector(".modal-backdrop")) {
        event.preventDefault();
        searchRef.current?.focus();
      }
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const reminders = useMemo(() => {
    const weekAgo = shiftDays(today, -7);
    const overdue = leads.filter((lead) => followBucket(lead, today) === "overdue").sort((a, b) => a.followUpDate.localeCompare(b.followUpDate));
    const dueToday = leads.filter((lead) => followBucket(lead, today) === "today");
    const registered = leads.filter((lead) => lead.status === "Registered" && localDay(lead.registeredAt) >= weekAgo);
    const due = overdue.length + dueToday.length;
    return { overdue, dueToday, registered, due, count: due + pool.length };
  }, [leads, pool, today]);

  const results = useMemo(() => {
    if (!query.trim()) return [];
    return leads
      .filter((lead) => includesQuery([lead.hospitalName, lead.contactPerson, lead.contactPhone, lead.contactEmail, lead.city], query))
      .slice(0, 8);
  }, [leads, query]);

  const current = [...NAV].reverse().find((item) => (item.end ? pathname.replace(/\/$/, "") === item.to : pathname.startsWith(item.to))) || NAV[0];
  const leadPage = pathname.startsWith(crmPath("/leads/"));
  const title = leadPage ? "Lead details" : current.label;
  const openResult = (lead) => {
    setQuery("");
    setMenu("");
    actions.openLead(lead.id);
  };

  return (
    <div className={`crm-app${mobileOpen ? " is-mobile-open" : ""}`}>
      <aside className="crm-side" aria-label="CRM navigation">
        <div className="crm-side-brand">
          <img src={logo} alt="" />
          <div className="crm-side-label">
            <strong>SaffoCare</strong>
            <span>CRM · Sales</span>
          </div>
          <button type="button" className="crm-icon-btn crm-side-close" onClick={() => setMobileOpen(false)} aria-label="Close navigation"><X size={18} /></button>
        </div>
        <nav className="crm-side-nav">
          {NAV.map((item) => {
            const Icon = item.icon;
            const badge = item.badge === "due" ? reminders.due : item.badge === "pool" ? pool.length : 0;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => `crm-side-link${isActive ? " active" : ""}`}
              >
                <Icon size={18} aria-hidden="true" />
                <span className="crm-side-label">{item.label}</span>
                {badge > 0 && (
                  <span className={`crm-side-badge${item.badge === "pool" ? " is-info" : ""}`} aria-label={item.badge === "pool" ? `${badge} unclaimed` : `${badge} due`}>{badge}</span>
                )}
              </NavLink>
            );
          })}
        </nav>
        <div className="crm-side-foot">
          <div className="crm-side-user">
            <span className="crm-avatar"><AvatarImage photo={photo} name={session.name} /></span>
            <div className="crm-side-label">
              <strong>{session.name}</strong>
              <span>{session.role || "CRM Executive"}</span>
            </div>
          </div>
        </div>
      </aside>
      <div className="crm-backdrop" onMouseDown={() => setMobileOpen(false)} aria-hidden="true" />

      <div className="crm-main">
        <header className="crm-top">
          <button type="button" className="crm-icon-btn crm-burger" onClick={() => setMobileOpen(true)} aria-label="Open navigation"><Menu size={20} /></button>
          <div className="crm-top-title">
            <h1>{title}</h1>
          </div>
          <div className="crm-top-tools" ref={menusRef}>
            <div className="crm-global-search">
              <Search size={16} aria-hidden="true" />
              <input
                ref={searchRef}
                value={query}
                placeholder="Search my leads…"
                aria-label="Search my leads"
                onChange={(event) => { setQuery(event.target.value); setMenu("search"); }}
                onFocus={() => setMenu("search")}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && results[0]) openResult(results[0]);
                  if (event.key === "Escape") { setQuery(""); setMenu(""); }
                }}
              />
              <kbd aria-hidden="true">/</kbd>
              {menu === "search" && query.trim() && (
                <div className="crm-pop crm-search-pop" role="listbox" aria-label="Search results">
                  {results.length === 0 ? (
                    <p className="crm-pop-empty">No leads match “{query.trim()}”.</p>
                  ) : results.map((lead) => (
                    <button key={lead.id} type="button" role="option" aria-selected="false" className="crm-pop-item" onClick={() => openResult(lead)}>
                      <span>
                        <strong>{lead.hospitalName}</strong>
                        <small>{lead.contactPerson} · {lead.city || "—"}</small>
                      </span>
                      <StatusMark status={lead.status} />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="crm-anchor">
              <button
                type="button"
                className="crm-icon-btn crm-bell"
                aria-haspopup="true"
                aria-expanded={menu === "bell"}
                aria-label={`Reminders, ${reminders.count} need attention`}
                onClick={() => setMenu(menu === "bell" ? "" : "bell")}
              >
                <Bell size={19} />
                {reminders.count > 0 && <span className="crm-bell-count">{reminders.count > 99 ? "99+" : reminders.count}</span>}
              </button>
              {menu === "bell" && (
                <div className="crm-pop crm-notify">
                  <header>
                    <strong>Reminders</strong>
                    <span>{reminders.due ? `${plural(reminders.due, "follow-up")} need attention` : reminders.count ? "No follow-ups due" : "You're all caught up"}</span>
                  </header>
                  <div className="crm-notify-list">
                    {pool.length > 0 && (
                      <Link to={`${crmPath("/leads")}?tab=New`} className="crm-pop-item is-info" onClick={() => setMenu("")}>
                        <span><strong>{pool.length === 1 ? "1 new enquiry" : `${pool.length} new enquiries`} waiting to be claimed</strong><small>Shared with every CRM employee — first to claim gets it</small></span>
                      </Link>
                    )}
                    {reminders.overdue.map((lead) => (
                      <button key={`o-${lead.id}`} type="button" className="crm-pop-item is-late" onClick={() => { setMenu(""); actions.openLead(lead.id); }}>
                        <span><strong>Overdue · {lead.hospitalName}</strong><small>Was due {formatDate(`${lead.followUpDate}T00:00:00`)}{lead.nextAction ? ` · ${lead.nextAction}` : ""}</small></span>
                      </button>
                    ))}
                    {reminders.dueToday.map((lead) => (
                      <button key={`t-${lead.id}`} type="button" className="crm-pop-item is-today" onClick={() => { setMenu(""); actions.openLead(lead.id); }}>
                        <span><strong>Due today · {lead.hospitalName}</strong><small>{lead.nextAction || "Follow-up due"}</small></span>
                      </button>
                    ))}
                    {reminders.registered.map((lead) => (
                      <button key={`r-${lead.id}`} type="button" className="crm-pop-item is-good" onClick={() => { setMenu(""); actions.openLead(lead.id); }}>
                        <span><strong>Registered · {lead.hospitalName}</strong><small>By {lead.registeredBy || "Accounts"} on {formatDate(lead.registeredAt)}</small></span>
                      </button>
                    ))}
                    {!reminders.count && !reminders.registered.length && <p className="crm-pop-empty">No reminders right now.</p>}
                  </div>
                  <footer>
                    <Link to={crmPath("/follow-ups")} onClick={() => setMenu("")}>Open Follow-ups &amp; Tasks</Link>
                  </footer>
                </div>
              )}
            </div>

            <div className="crm-anchor">
              <button type="button" className="crm-profile-btn" aria-haspopup="menu" aria-expanded={menu === "profile"} onClick={() => setMenu(menu === "profile" ? "" : "profile")}>
                <span className="crm-avatar"><AvatarImage photo={photo} name={session.name} /></span>
                <span className="crm-profile-name">{session.name}</span>
                <ChevronDown size={15} aria-hidden="true" />
              </button>
              {menu === "profile" && (
                <div className="crm-pop crm-profile-pop" role="menu">
                  <div className="crm-profile-card">
                    <span className="crm-avatar"><AvatarImage photo={photo} name={session.name} /></span>
                    <div>
                      <strong>{session.name}</strong>
                      <span>{session.role || "CRM Executive"}</span>
                      <span>{session.email}</span>
                    </div>
                  </div>
                  <Link role="menuitem" className="crm-pop-item" to={crmPath("/profile")} onClick={() => setMenu("")}><UserRound size={15} aria-hidden="true" />My profile</Link>
                  <Link role="menuitem" className="crm-pop-item" to={crmPath("/performance")} onClick={() => setMenu("")}><TrendingUp size={15} aria-hidden="true" />My Performance</Link>
                  <button role="menuitem" type="button" className="crm-pop-item crm-danger-text" onClick={() => { setMenu(""); logoutConfirmation.requestLogout(); }}><LogOut size={15} aria-hidden="true" />Log out</button>
                </div>
              )}
            </div>
          </div>
        </header>
        {logoutConfirmation.dialog}
        <main className="crm-content">
          <ErrorBoundary key={pathname}>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}

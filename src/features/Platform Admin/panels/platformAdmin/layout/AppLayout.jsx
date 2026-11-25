import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { portalSessionIsAuthenticated } from "../../../shared/api/platformSession";
import { usePlatform } from "../../../shared/context/PlatformContext";
import PortalEntryFallback from "../../../shared/portal/PortalEntryFallback";
import Header from "./Header";
import Sidebar from "./Sidebar";
import "../../../shared/layout/AppShell.css";
import "./AppLayout.css";
import "./platformButtons.css";

export default function AppLayout() {
  const { sessionFor } = usePlatform();
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

  if (!portalSessionIsAuthenticated("platform", sessionFor("platform"))) {
    return <PortalEntryFallback portal="platform" />;
  }

  return (
    <div className={`app-shell${navOpen ? " is-nav-open" : ""}`}>
      <Sidebar onNavigate={() => setNavOpen(false)} />
      <button type="button" className="nav-backdrop" aria-label="Close navigation" onClick={() => setNavOpen(false)} />
      <div className="main-column">
        <Header navOpen={navOpen} onOpenNav={() => setNavOpen(true)} />
        <div className="content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}

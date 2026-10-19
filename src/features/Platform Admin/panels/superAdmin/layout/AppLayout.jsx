import { Outlet } from "react-router-dom";
import { portalSessionIsAuthenticated } from "../../../shared/api/platformSession";
import { usePlatform } from "../../../shared/context/PlatformContext";
import PortalEntryFallback from "../../../shared/portal/PortalEntryFallback";
import Header from "./Header";
import Sidebar from "./Sidebar";
import "../../../shared/layout/AppShell.css";
import "./AppLayout.css";

export default function AppLayout() {
  const { sessionFor } = usePlatform();

  if (!portalSessionIsAuthenticated("platform", sessionFor("platform"))) {
    return <PortalEntryFallback portal="platform" />;
  }

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main-column">
        <Header />
        <div className="content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}

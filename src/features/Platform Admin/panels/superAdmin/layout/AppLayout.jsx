import { Navigate, Outlet } from "react-router-dom";
import { usePlatform } from "../../../shared/context/PlatformContext";
import { platformPath } from "../../../shared/paths";
import Header from "./Header";
import Sidebar from "./Sidebar";
import "../../../shared/layout/AppShell.css";
import "./AppLayout.css";

export default function AppLayout() {
  const { sessionFor, profile } = usePlatform();

  if (!sessionFor("platform")?.userId) {
    return <Navigate to={platformPath("/login")} replace />;
  }

  return (
    <div className={`app-shell ${profile.density === "Compact" ? "density-compact" : ""}`}>
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

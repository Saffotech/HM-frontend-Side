import { Link, useLocation } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { usePlatform } from "../../../shared/context/PlatformContext";
import { PLATFORM_BASE } from "../../../shared/paths";
import "./Breadcrumbs.css";

const titles = {
  "/": "Dashboard",
  "/analytics": "Platform Analytics",
  "/hospitals": "Hospitals / Tenants",
  "/hospitals/register": "Register Hospital",
  "/crm-performance": "CRM & Performance",
  "/billing/plans": "Subscription Plans",
  "/billing/subscriptions": "Subscriptions",
  "/billing/revenue": "Billing & Revenue",
  "/profile": "My Profile",
  "/help": "Help & Documentation",
};

export default function Breadcrumbs() {
  const location = useLocation();
  const pathname = location.pathname.slice(PLATFORM_BASE.length).replace(/\/$/, "") || "/";
  const { hospitals } = usePlatform();
  const tenantMatch = pathname.match(/^\/hospitals\/([^/]+)$/);

  if (!titles[pathname] && tenantMatch) {
    const hospital = hospitals.find((item) => item.id === decodeURIComponent(tenantMatch[1]));
    return (
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <Link to={`${PLATFORM_BASE}/hospitals`}>{titles["/hospitals"]}</Link>
        <ChevronRight size={20} aria-hidden="true" />
        <span className="breadcrumbs-current">{hospital?.name || "Tenant details"}</span>
      </nav>
    );
  }

  return (
    <nav className="breadcrumbs" aria-label="Breadcrumb">
      <span className="breadcrumbs-current">{titles[pathname] || "Not found"}</span>
    </nav>
  );
}

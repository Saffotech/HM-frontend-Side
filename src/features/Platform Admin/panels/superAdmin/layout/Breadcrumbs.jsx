import { Link, useLocation } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { platformAuth } from "../../../shared/api/platformSession";
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
};

export default function Breadcrumbs() {
  const location = useLocation();
  const pathname = location.pathname.slice(PLATFORM_BASE.length).replace(/\/$/, "") || "/";
  const tenantMatch = pathname.match(/^\/hospitals\/([^/]+)$/);

  if (!titles[pathname] && tenantMatch) {
    const tenant = platformAuth.recallRegisteredTenant(decodeURIComponent(tenantMatch[1]));
    return (
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <Link to={`${PLATFORM_BASE}/hospitals`}>{titles["/hospitals"]}</Link>
        <ChevronRight size={20} aria-hidden="true" />
        <span className="breadcrumbs-current">{tenant?.name || "Tenant details"}</span>
      </nav>
    );
  }

  return (
    <nav className="breadcrumbs" aria-label="Breadcrumb">
      <span className="breadcrumbs-current">{titles[pathname] || "Not found"}</span>
    </nav>
  );
}

import { useLocation } from "react-router-dom";
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
  "/staff": "Platform Staff",
};

export default function Breadcrumbs() {
  const location = useLocation();
  const pathname = location.pathname.slice(PLATFORM_BASE.length).replace(/\/$/, "") || "/";
  const tenantMatch = pathname.match(/^\/hospitals\/([^/]+)$/);

  if (!titles[pathname] && tenantMatch) {
    return (
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <span className="breadcrumbs-current">Tenant details</span>
      </nav>
    );
  }

  return (
    <nav className="breadcrumbs" aria-label="Breadcrumb">
      <span className="breadcrumbs-current">{titles[pathname] || "Not found"}</span>
    </nav>
  );
}

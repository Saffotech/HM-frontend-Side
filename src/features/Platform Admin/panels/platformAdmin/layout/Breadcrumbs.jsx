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
    return <h1 className="breadcrumbs-current">Tenant details</h1>;
  }

  return <h1 className="breadcrumbs-current">{titles[pathname] || "Not found"}</h1>;
}

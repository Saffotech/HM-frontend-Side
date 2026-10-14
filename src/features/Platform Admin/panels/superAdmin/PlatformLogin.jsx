import PortalLogin from "../../shared/portal/PortalLogin";
import { PLATFORM_BASE, crmPath } from "../../shared/paths";

export default function PlatformLogin() {
  return (
    <PortalLogin
      portal="platform"
      title="Platform Admin"
      lead="Manage hospitals, subscriptions, and platform billing."
      home={PLATFORM_BASE}
      other={{ to: crmPath("/login"), label: "CRM portal" }}
    />
  );
}

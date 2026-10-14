import PortalLogin from "../../shared/portal/PortalLogin";
import { CRM_BASE, accountsPath } from "../../shared/paths";

export default function CrmLogin() {
  return (
    <PortalLogin
      portal="crm"
      title="CRM Portal"
      lead="Work hospital requests, follow-ups, and registration."
      home={CRM_BASE}
      other={{ to: accountsPath("/login"), label: "Accountant portal" }}
    />
  );
}

import PortalLogin from "../../shared/portal/PortalLogin";
import { ACCOUNTS_BASE, crmPath } from "../../shared/paths";

export default function AccountantLogin() {
  return (
    <PortalLogin
      portal="accountant"
      title="Accountant Portal"
      lead="Collect invoices, record payments, and send reminders."
      home={ACCOUNTS_BASE}
      other={{ to: crmPath("/login"), label: "CRM portal" }}
    />
  );
}

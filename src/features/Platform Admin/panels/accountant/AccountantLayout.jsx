import { Building2, LayoutDashboard, Receipt, UserRound } from "lucide-react";
import PortalLayout from "../../shared/portal/PortalLayout";
import { usePlatform } from "../../shared/context/PlatformContext";
import { ACCOUNTS_BASE, accountsPath } from "../../shared/paths";

const titles = {
  [ACCOUNTS_BASE]: "Collections",
  [accountsPath("/invoices")]: "Invoices & Payments",
  [accountsPath("/registrations")]: "Hospital Registrations",
  [`${accountsPath("/registrations")}/`]: "Register Hospital",
  [`${accountsPath("/hospitals")}/`]: "Hospital Billing",
  [accountsPath("/profile")]: "Profile",
};

export default function AccountantLayout() {
  const { onboarding } = usePlatform();
  const waiting = onboarding.filter((item) => item.status === "Agreed").length;
  const items = [
    { to: ACCOUNTS_BASE, label: "Collections", icon: LayoutDashboard, end: true },
    { to: accountsPath("/invoices"), label: "Invoices & Payments", icon: Receipt },
    { to: accountsPath("/registrations"), label: "Hospital Registrations", icon: Building2, badge: waiting },
    { to: accountsPath("/profile"), label: "Profile", icon: UserRound },
  ];

  return (
    <PortalLayout
      portal="accountant"
      name="Accountant Portal"
      login={accountsPath("/login")}
      profilePath={accountsPath("/profile")}
      items={items}
      titles={titles}
      className="portal-accounts"
    />
  );
}

import { useEffect, useState } from "react";
import { Building2, LayoutDashboard, Receipt, UserRound } from "lucide-react";
import PortalLayout from "../../shared/portal/PortalLayout";
import { listRegistrations } from "../../shared/api/registrationApi";
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
  const [waiting, setWaiting] = useState(0);

  useEffect(() => {
    let cancelled = false;
    listRegistrations("agreed")
      .then((rows) => {
        if (!cancelled) setWaiting(Array.isArray(rows) ? rows.length : 0);
      })
      .catch(() => {
        if (!cancelled) setWaiting(0);
      });
    return () => {
      cancelled = true;
    };
  }, []);

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
      profilePath={accountsPath("/profile")}
      items={items}
      titles={titles}
      className="portal-accounts"
    />
  );
}

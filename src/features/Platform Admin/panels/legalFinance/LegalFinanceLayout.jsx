import { Building2, LayoutDashboard, Scale, UserRound, Wallet } from "lucide-react";
import { Outlet, useLocation } from "react-router-dom";
import { usePlatform } from "../../shared/context/PlatformContext";
import { LEGAL_FINANCE_BASE, legalFinancePath } from "../../shared/paths";
import PortalLayout from "../../shared/portal/PortalLayout";
import ModalHost from "./components/ModalHost";
import Toast from "./components/Toast";
import { LF_BASE_PATH } from "./constants";
import { LegalFinanceProvider, useLegalFinance } from "./context/LegalFinanceContext";
import "./styles/legalFinance.css";

export default function LegalFinanceLayout() {
  const { sessionFor } = usePlatform();
  const session = sessionFor("legalFinance");
  return (
    <LegalFinanceProvider user={session}>
      <LegalFinanceShell />
    </LegalFinanceProvider>
  );
}

function LegalFinanceShell() {
  const { ws } = useLegalFinance();
  const { pathname } = useLocation();
  const section = pathname.replace(LF_BASE_PATH, "").replace(/^\//, "");
  const crumb = {
    cases: `My ${ws.pl}`,
    legal: "Legal Docs",
    finance: "Finance",
    profile: "Profile",
  }[section];
  const items = [
    { to: LEGAL_FINANCE_BASE, label: "Dashboard", icon: LayoutDashboard, end: true },
    { to: legalFinancePath("/cases"), label: `My ${ws.pl}`, icon: Building2 },
    { to: legalFinancePath("/legal"), label: "Legal Docs", icon: Scale },
    { to: legalFinancePath("/finance"), label: "Finance", icon: Wallet },
    { to: legalFinancePath("/profile"), label: "Profile", icon: UserRound },
  ];
  const titles = {
    [LEGAL_FINANCE_BASE]: "Dashboard",
    [legalFinancePath("/cases")]: `My ${ws.pl}`,
    [legalFinancePath("/legal")]: "Legal Docs",
    [legalFinancePath("/finance")]: "Finance",
    [legalFinancePath("/profile")]: "Profile",
  };

  return (
    <PortalLayout
      portal="legalFinance"
      name="Legal & Finance"
      profilePath={legalFinancePath("/profile")}
      items={items}
      titles={titles}
      className="portal-legal-finance"
      showLogout={false}
      headerLeft={<h1 className="portal-title">{crumb || "Dashboard"}</h1>}
    />
  );
}

/** Page body inside PortalLayout. Sections render directly; modals stay mounted here. */
export function LegalFinanceWorkspace() {
  const { wsType } = useLegalFinance();
  return (
    <div className="lf-panel" data-ws={wsType}>
      <div className="lf-body fadein" key={wsType}>
        <Outlet />
      </div>
      <ModalHost />
      <Toast />
    </div>
  );
}

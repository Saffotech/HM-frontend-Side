import { lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { LEGAL_FINANCE_BASE, UNIVERSAL_LOGIN } from "../../shared/paths";
import PlatformPage from "../../shared/PlatformPage";
import LegalFinanceLayout, { LegalFinanceWorkspace } from "./LegalFinanceLayout";

const Dashboard = lazy(() => import("./pages/Dashboard"));
const Finance = lazy(() => import("./pages/Finance"));
const LegalDocs = lazy(() => import("./pages/LegalDocs"));
const MyCases = lazy(() => import("./pages/MyCases"));
const Profile = lazy(() => import("./pages/Profile"));

export default function LegalFinanceRoutes() {
  return (
    <Routes>
      <Route path="login" element={<Navigate to={UNIVERSAL_LOGIN} replace />} />
      <Route element={<LegalFinanceLayout />}>
        <Route element={<LegalFinanceWorkspace />}>
          <Route index element={<PlatformPage><Dashboard /></PlatformPage>} />
          <Route path="cases" element={<PlatformPage><MyCases /></PlatformPage>} />
          <Route path="legal" element={<PlatformPage><LegalDocs /></PlatformPage>} />
          <Route path="finance" element={<PlatformPage><Finance /></PlatformPage>} />
          <Route path="profile" element={<PlatformPage><Profile /></PlatformPage>} />
          <Route path="*" element={<Navigate to={LEGAL_FINANCE_BASE} replace />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to={LEGAL_FINANCE_BASE} replace />} />
    </Routes>
  );
}

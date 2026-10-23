import { lazy } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { CRM_BASE, UNIVERSAL_LOGIN, crmPath } from "../../shared/paths";
import PlatformPage from "../../shared/PlatformPage";
import CrmLayout from "./CrmLayout";

const Conversions = lazy(() => import("./pages/Conversions"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const FollowUps = lazy(() => import("./pages/FollowUps"));
const LeadDetails = lazy(() => import("./pages/LeadDetails"));
const Leads = lazy(() => import("./pages/Leads"));
const Performance = lazy(() => import("./pages/Performance"));
const Profile = lazy(() => import("./pages/Profile"));

function LegacyLeadsRedirect() {
  const { search } = useLocation();
  return <Navigate to={`${crmPath("/leads")}${search}`} replace />;
}

export default function CrmRoutes() {
  return (
    <Routes>
      <Route path="login" element={<Navigate to={UNIVERSAL_LOGIN} replace />} />
      <Route element={<CrmLayout />}>
        <Route index element={<PlatformPage><Dashboard /></PlatformPage>} />
        <Route path="leads" element={<PlatformPage><Leads /></PlatformPage>} />
        <Route path="leads/:leadId" element={<PlatformPage><LeadDetails /></PlatformPage>} />
        <Route path="follow-ups" element={<PlatformPage><FollowUps /></PlatformPage>} />
        <Route path="conversions" element={<PlatformPage><Conversions /></PlatformPage>} />
        <Route path="performance" element={<PlatformPage><Performance /></PlatformPage>} />
        <Route path="profile" element={<PlatformPage><Profile /></PlatformPage>} />
        <Route path="onboarding" element={<LegacyLeadsRedirect />} />
      </Route>
      <Route path="*" element={<Navigate to={CRM_BASE} replace />} />
    </Routes>
  );
}

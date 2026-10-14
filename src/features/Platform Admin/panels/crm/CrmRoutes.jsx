import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { CRM_BASE, crmPath } from "../../shared/paths";
import CrmLayout from "./CrmLayout";
import CrmLogin from "./CrmLogin";
import Conversions from "./pages/Conversions";
import Dashboard from "./pages/Dashboard";
import FollowUps from "./pages/FollowUps";
import LeadDetails from "./pages/LeadDetails";
import Leads from "./pages/Leads";
import Performance from "./pages/Performance";
import Profile from "./pages/Profile";

function LegacyLeadsRedirect() {
  const { search } = useLocation();
  return <Navigate to={`${crmPath("/leads")}${search}`} replace />;
}

export default function CrmRoutes() {
  return (
    <Routes>
      <Route path="login" element={<CrmLogin />} />
      <Route element={<CrmLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="leads" element={<Leads />} />
        <Route path="leads/:leadId" element={<LeadDetails />} />
        <Route path="follow-ups" element={<FollowUps />} />
        <Route path="conversions" element={<Conversions />} />
        <Route path="performance" element={<Performance />} />
        <Route path="profile" element={<Profile />} />
        <Route path="onboarding" element={<LegacyLeadsRedirect />} />
      </Route>
      <Route path="*" element={<Navigate to={CRM_BASE} replace />} />
    </Routes>
  );
}

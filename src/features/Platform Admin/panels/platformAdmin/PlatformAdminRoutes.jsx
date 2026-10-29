import { lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { UNIVERSAL_LOGIN, platformPath } from "../../shared/paths";
import PlatformPage from "../../shared/PlatformPage";
import AppLayout from "./layout/AppLayout";

const MyProfile = lazy(() => import("./pages/account/MyProfile"));
const PlatformStaff = lazy(() => import("./pages/account/PlatformStaff"));
const PlatformAnalytics = lazy(() => import("./pages/analytics/PlatformAnalytics"));
const InvoicesPayments = lazy(() => import("./pages/billing/InvoicesPayments"));
const SubscriptionPlans = lazy(() => import("./pages/billing/SubscriptionPlans"));
const Subscriptions = lazy(() => import("./pages/billing/Subscriptions"));
const Dashboard = lazy(() => import("./pages/dashboard/Dashboard"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Hospitals = lazy(() => import("./pages/tenants/Hospitals"));
const CrmPerformance = lazy(() => import("./pages/tenants/crmPerformance/CrmPerformance"));
const RegisterHospital = lazy(() => import("./pages/tenants/RegisterHospital"));
const TenantDetails = lazy(() => import("./pages/tenants/TenantDetails"));

// Legacy reference: this module was panels/superAdmin/SuperAdminRoutes.jsx and
// exported SuperAdminRoutes. The previous implementation is preserved as comments
// in panels/superAdmin/SuperAdminRoutes.jsx and is not registered. Remove that
// file after verification.
// export default function SuperAdminRoutes() { /* see panels/superAdmin/SuperAdminRoutes.jsx */ }
export default function PlatformAdminRoutes() {
  return (
    <Routes>
      <Route path="login" element={<Navigate to={UNIVERSAL_LOGIN} replace />} />
      <Route element={<AppLayout />}>
        <Route index element={<PlatformPage><Dashboard /></PlatformPage>} />
        <Route path="analytics" element={<PlatformPage><PlatformAnalytics /></PlatformPage>} />
        <Route path="hospitals" element={<PlatformPage><Hospitals /></PlatformPage>} />
        <Route path="hospitals/register" element={<PlatformPage><RegisterHospital /></PlatformPage>} />
        <Route path="hospitals/:tenantId" element={<PlatformPage><TenantDetails /></PlatformPage>} />
        <Route path="crm-performance" element={<PlatformPage><CrmPerformance /></PlatformPage>} />
        <Route path="onboarding" element={<Navigate to={platformPath("/crm-performance")} replace />} />
        <Route path="billing/plans" element={<PlatformPage><SubscriptionPlans /></PlatformPage>} />
        <Route path="billing/subscriptions" element={<PlatformPage><Subscriptions /></PlatformPage>} />
        <Route path="billing/revenue" element={<PlatformPage><InvoicesPayments /></PlatformPage>} />
        <Route path="billing/invoices" element={<Navigate to={platformPath("/billing/revenue")} replace />} />
        <Route path="staff" element={<PlatformPage><PlatformStaff /></PlatformPage>} />
        <Route path="profile" element={<PlatformPage><MyProfile /></PlatformPage>} />
        <Route path="*" element={<PlatformPage><NotFound /></PlatformPage>} />
      </Route>
    </Routes>
  );
}

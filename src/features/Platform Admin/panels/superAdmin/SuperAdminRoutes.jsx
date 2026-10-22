import { Navigate, Route, Routes } from "react-router-dom";
import { UNIVERSAL_LOGIN, platformPath } from "../../shared/paths";
import AppLayout from "./layout/AppLayout";
import MyProfile from "./pages/account/MyProfile";
import PlatformStaff from "./pages/account/PlatformStaff";
import PlatformAnalytics from "./pages/analytics/PlatformAnalytics";
import InvoicesPayments from "./pages/billing/InvoicesPayments";
import SubscriptionPlans from "./pages/billing/SubscriptionPlans";
import Subscriptions from "./pages/billing/Subscriptions";
import Dashboard from "./pages/dashboard/Dashboard";
import NotFound from "./pages/NotFound";
import Hospitals from "./pages/tenants/Hospitals";
import CrmPerformance from "./pages/tenants/crmPerformance/CrmPerformance";
import RegisterHospital from "./pages/tenants/RegisterHospital";
import TenantDetails from "./pages/tenants/TenantDetails";

export default function SuperAdminRoutes() {
  return (
    <Routes>
      <Route path="login" element={<Navigate to={UNIVERSAL_LOGIN} replace />} />
      <Route element={<AppLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="analytics" element={<PlatformAnalytics />} />
        <Route path="hospitals" element={<Hospitals />} />
        <Route path="hospitals/register" element={<RegisterHospital />} />
        <Route path="hospitals/:tenantId" element={<TenantDetails />} />
        <Route path="crm-performance" element={<CrmPerformance />} />
        <Route path="onboarding" element={<Navigate to={platformPath("/crm-performance")} replace />} />
        <Route path="billing/plans" element={<SubscriptionPlans />} />
        <Route path="billing/subscriptions" element={<Subscriptions />} />
        <Route path="billing/revenue" element={<InvoicesPayments />} />
        <Route path="billing/invoices" element={<Navigate to={platformPath("/billing/revenue")} replace />} />
        <Route path="staff" element={<PlatformStaff />} />
        <Route path="profile" element={<MyProfile />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}

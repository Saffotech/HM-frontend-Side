import { Navigate, Route, Routes } from "react-router-dom";
import { platformPath } from "../../shared/paths";
import AppLayout from "./layout/AppLayout";
import HelpDocumentation from "./pages/account/HelpDocumentation";
import MyProfile from "./pages/account/MyProfile";
import PlatformAnalytics from "./pages/analytics/PlatformAnalytics";
import InvoicesPayments from "./pages/billing/InvoicesPayments";
import SubscriptionPlans from "./pages/billing/SubscriptionPlans";
import Subscriptions from "./pages/billing/Subscriptions";
import Dashboard from "./pages/dashboard/Dashboard";
import NotFound from "./pages/NotFound";
import Hospitals from "./pages/tenants/Hospitals";
import OnboardingRequests from "./pages/tenants/OnboardingRequests";
import RegisterHospital from "./pages/tenants/RegisterHospital";
import TenantDetails from "./pages/tenants/TenantDetails";
import PlatformLogin from "./PlatformLogin";

export default function SuperAdminRoutes() {
  return (
    <Routes>
      <Route path="login" element={<PlatformLogin />} />
      <Route element={<AppLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="analytics" element={<PlatformAnalytics />} />
        <Route path="hospitals" element={<Hospitals />} />
        <Route path="hospitals/register" element={<RegisterHospital />} />
        <Route path="hospitals/:tenantId" element={<TenantDetails />} />
        <Route path="crm-performance" element={<OnboardingRequests />} />
        <Route path="onboarding" element={<Navigate to={platformPath("/crm-performance")} replace />} />
        <Route path="billing/plans" element={<SubscriptionPlans />} />
        <Route path="billing/subscriptions" element={<Subscriptions />} />
        <Route path="billing/revenue" element={<InvoicesPayments />} />
        <Route path="billing/invoices" element={<Navigate to={platformPath("/billing/revenue")} replace />} />
        <Route path="profile" element={<MyProfile />} />
        <Route path="help" element={<HelpDocumentation />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}

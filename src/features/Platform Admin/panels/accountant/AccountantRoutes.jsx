import { lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { ACCOUNTS_BASE, UNIVERSAL_LOGIN } from "../../shared/paths";
import PlatformPage from "../../shared/PlatformPage";
import AccountantLayout from "./AccountantLayout";

const Collections = lazy(() => import("./pages/Collections"));
const HospitalBilling = lazy(() => import("./pages/HospitalBilling"));
const InvoicesPayments = lazy(() => import("./pages/InvoicesPayments"));
const Profile = lazy(() => import("./pages/Profile"));
const RegisterHospital = lazy(() => import("./pages/RegisterHospital"));
const Registrations = lazy(() => import("./pages/Registrations"));

export default function AccountantRoutes() {
  return (
    <Routes>
      <Route path="login" element={<Navigate to={UNIVERSAL_LOGIN} replace />} />
      <Route element={<AccountantLayout />}>
        <Route index element={<PlatformPage><Collections /></PlatformPage>} />
        <Route path="invoices" element={<PlatformPage><InvoicesPayments /></PlatformPage>} />
        <Route path="hospitals/:id" element={<PlatformPage><HospitalBilling /></PlatformPage>} />
        <Route path="registrations" element={<PlatformPage><Registrations /></PlatformPage>} />
        <Route path="registrations/:id" element={<PlatformPage><RegisterHospital /></PlatformPage>} />
        <Route path="profile" element={<PlatformPage><Profile /></PlatformPage>} />
      </Route>
      <Route path="*" element={<Navigate to={ACCOUNTS_BASE} replace />} />
    </Routes>
  );
}

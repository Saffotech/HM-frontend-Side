import { Navigate, Route, Routes } from "react-router-dom";
import { ACCOUNTS_BASE, UNIVERSAL_LOGIN } from "../../shared/paths";
import AccountantLayout from "./AccountantLayout";
import Collections from "./pages/Collections";
import HospitalBilling from "./pages/HospitalBilling";
import InvoicesPayments from "./pages/InvoicesPayments";
import Profile from "./pages/Profile";
import RegisterHospital from "./pages/RegisterHospital";
import Registrations from "./pages/Registrations";

export default function AccountantRoutes() {
  return (
    <Routes>
      <Route path="login" element={<Navigate to={UNIVERSAL_LOGIN} replace />} />
      <Route element={<AccountantLayout />}>
        <Route index element={<Collections />} />
        <Route path="invoices" element={<InvoicesPayments />} />
        <Route path="hospitals/:id" element={<HospitalBilling />} />
        <Route path="registrations" element={<Registrations />} />
        <Route path="registrations/:id" element={<RegisterHospital />} />
        <Route path="profile" element={<Profile />} />
      </Route>
      <Route path="*" element={<Navigate to={ACCOUNTS_BASE} replace />} />
    </Routes>
  );
}

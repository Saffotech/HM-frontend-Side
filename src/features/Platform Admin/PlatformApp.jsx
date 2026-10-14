import { Route, Routes } from "react-router-dom";
import { PlatformProvider } from "./shared/context/PlatformContext";
import ToastProvider from "./shared/components/ToastProvider";
import SuperAdminRoutes from "./panels/superAdmin/SuperAdminRoutes";
import CrmRoutes from "./panels/crm/CrmRoutes";
import AccountantRoutes from "./panels/accountant/AccountantRoutes";
import "./shared/styles/global.css";

/**
 * Platform (SaaS owner) app — mounted at `/platform/*` by src/App.jsx.
 * Uses its own provider and session state; never touches hospital AuthContext or apiClient.
 */
export default function PlatformApp() {
  return (
    <div className="platform-root">
      <PlatformProvider>
        <ToastProvider>
          <Routes>
            <Route path="crm/*" element={<CrmRoutes />} />
            <Route path="accounts/*" element={<AccountantRoutes />} />
            <Route path="*" element={<SuperAdminRoutes />} />
          </Routes>
        </ToastProvider>
      </PlatformProvider>
    </div>
  );
}

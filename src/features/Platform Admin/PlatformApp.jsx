import { lazy, Suspense } from "react";
import { Route, Routes } from "react-router-dom";
import { PlatformProvider } from "./shared/context/PlatformContext";
import ToastProvider from "./shared/components/ToastProvider";
import "./shared/styles/global.css";

const SuperAdminRoutes = lazy(() => import("./panels/superAdmin/SuperAdminRoutes"));
const CrmRoutes = lazy(() => import("./panels/crm/CrmRoutes"));
const AccountantRoutes = lazy(() => import("./panels/accountant/AccountantRoutes"));

/**
 * Platform (SaaS owner) app — mounted at `/platform/*` by src/App.jsx.
 * Uses its own provider and session state; never touches hospital AuthContext or apiClient.
 * Each portal and page is a separate chunk so charts and unused portals stay unloaded.
 */
export default function PlatformApp() {
  return (
    <div className="platform-root">
      <PlatformProvider>
        <ToastProvider>
          <Suspense fallback={<p className="panel-copy" role="status">Loading…</p>}>
            <Routes>
              <Route path="crm/*" element={<CrmRoutes />} />
              <Route path="accounts/*" element={<AccountantRoutes />} />
              <Route path="*" element={<SuperAdminRoutes />} />
            </Routes>
          </Suspense>
        </ToastProvider>
      </PlatformProvider>
    </div>
  );
}

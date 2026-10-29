import { lazy, Suspense } from "react";
import { Route, Routes } from "react-router-dom";
import { PlatformProvider } from "./shared/context/PlatformContext";
import { InAppHistoryTracker } from "./shared/navigation/InAppHistoryTracker";
import ToastProvider from "./shared/components/ToastProvider";
import "./shared/styles/global.css";

// Legacy reference: this panel was lazy-loaded as SuperAdminRoutes from
// ./panels/superAdmin/SuperAdminRoutes. Retained so it can be removed after verification.
// Do not register both route trees.
// const SuperAdminRoutes = lazy(() => import("./panels/superAdmin/SuperAdminRoutes"));
const PlatformAdminRoutes = lazy(() => import("./panels/platformAdmin/PlatformAdminRoutes"));
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
          <InAppHistoryTracker>
            <Suspense fallback={<p className="panel-copy" role="status">Loading…</p>}>
              <Routes>
                <Route path="crm/*" element={<CrmRoutes />} />
                <Route path="accounts/*" element={<AccountantRoutes />} />
                {/* Previous registration, retained for reference. Remove after verification.
                    <Route path="*" element={<SuperAdminRoutes />} /> */}
                <Route path="*" element={<PlatformAdminRoutes />} />
              </Routes>
            </Suspense>
          </InAppHistoryTracker>
        </ToastProvider>
      </PlatformProvider>
    </div>
  );
}

import { useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { readActivePortalSession } from "../api/platformSession";
import { usePlatform } from "../context/PlatformContext";
import { UNIVERSAL_LOGIN } from "../paths";
import { dashboardForRole, loginRedirectState } from "../../../../shared/auth/universalLoginPolicy.js";

/**
 * Unauthenticated portal shell. A different portal session goes to that
 * dashboard. The same portal session is restored. Everyone else goes to /login.
 */
export default function PortalEntryFallback({ portal }) {
  const location = useLocation();
  const { openPortalSession } = usePlatform();
  const active = readActivePortalSession();
  const activeUserId = active?.portal === portal ? active.session?.userId ?? null : null;

  useEffect(() => {
    if (activeUserId == null) return;
    const stored = readActivePortalSession();
    if (stored?.portal !== portal || stored.session?.userId == null) return;
    openPortalSession(portal, stored.session);
  }, [activeUserId, openPortalSession, portal]);

  if (active?.portal === portal) return null;

  if (active?.role && active.portal !== portal) {
    const home = dashboardForRole(active.role);
    if (home) return <Navigate to={home} replace />;
  }

  return <Navigate to={UNIVERSAL_LOGIN} replace state={loginRedirectState(location)} />;
}

import { useCallback, useEffect, useState } from "react";
import { getCrmAnalytics, mapCrmAnalytics } from "../api/platformCrmAnalytics";
import { platformCallMessage, shouldEndPlatformSession } from "../api/platformErrors";
import { usePlatform } from "../context/PlatformContext";

/** Company-wide lead counts. Lead lists stay on GET /crm/leads. */
export function useCrmAnalytics() {
  const { signOutPortal } = usePlatform();
  const [statuses, setStatuses] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const reload = useCallback(() => setAttempt((current) => current + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    getCrmAnalytics()
      .then((body) => {
        if (cancelled) return;
        const mapped = mapCrmAnalytics(body);
        if (!mapped.ok) {
          setStatuses(null);
          setError("CRM analytics response was not recognized.");
          return;
        }
        setStatuses(mapped.statuses);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(platformCallMessage(err));
        if (shouldEndPlatformSession(err)) signOutPortal("platform");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [attempt, signOutPortal]);

  return { statuses, loading, error, reload };
}

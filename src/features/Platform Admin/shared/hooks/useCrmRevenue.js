import { useCallback, useEffect, useState } from "react";
import { getCrmRevenue } from "../api/crmAccount";
import { mapCrmRevenue } from "../api/crmAccountModel";
import { platformCallMessage, shouldEndPlatformSession } from "../api/platformErrors";
import { usePlatform } from "../context/PlatformContext";

export function useCrmRevenue() {
  const { signOutPortal } = usePlatform();
  const [revenue, setRevenue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const reload = useCallback(() => setAttempt((current) => current + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    getCrmRevenue()
      .then((body) => {
        if (cancelled) return;
        const mapped = mapCrmRevenue(body);
        if (!mapped.ok) {
          setRevenue(null);
          setError("Revenue response was not recognized.");
          return;
        }
        setRevenue(mapped.revenue);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(platformCallMessage(err));
        if (shouldEndPlatformSession(err)) signOutPortal("crm");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [attempt, signOutPortal]);

  return { revenue, loading, error, reload };
}

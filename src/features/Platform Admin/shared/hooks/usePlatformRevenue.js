import { useCallback, useEffect, useState } from "react";
import { getPlatformRevenue, mapPlatformRevenue } from "../api/platformRevenue";
import { platformCallMessage, shouldEndPlatformSession } from "../api/platformErrors";
import { usePlatform } from "../context/PlatformContext";

export function usePlatformRevenue() {
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
    getPlatformRevenue()
      .then((body) => {
        if (cancelled) return;
        const mapped = mapPlatformRevenue(body);
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
        if (shouldEndPlatformSession(err)) signOutPortal("platform");
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

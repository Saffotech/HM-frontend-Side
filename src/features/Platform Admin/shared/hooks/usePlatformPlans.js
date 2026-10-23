import { useCallback, useEffect, useState } from "react";
import { listPlatformPlans, mapPlatformPlans } from "../api/platformPlans";
import { platformCallMessage, shouldEndPlatformSession } from "../api/platformErrors";
import { usePlatform } from "../context/PlatformContext";

export function usePlatformPlans() {
  const { signOutPortal } = usePlatform();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const reload = useCallback(() => setAttempt((current) => current + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    listPlatformPlans()
      .then((body) => {
        if (cancelled) return;
        const mapped = mapPlatformPlans(body);
        if (!mapped.ok) {
          setPlans([]);
          setError("Plan catalog response was not a list.");
          return;
        }
        setPlans(mapped.plans);
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

  return { plans, loading, error, reload };
}

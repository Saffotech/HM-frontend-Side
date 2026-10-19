import { useEffect, useState } from "react";
import { interpretPlatformError } from "../../shared/api/platformErrors";
import { listTenants } from "../../shared/api/registrationApi";

export function useRegisteredHospitals() {
  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    listTenants()
      .then((body) => {
        if (cancelled) return;
        const rows = Array.isArray(body) ? body : [];
        rows.sort((left, right) => String(right.created_at || "").localeCompare(String(left.created_at || "")));
        setHospitals(rows);
      })
      .catch((err) => {
        if (cancelled) return;
        setHospitals([]);
        setError(interpretPlatformError(err).toast);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { hospitals, loading, error };
}

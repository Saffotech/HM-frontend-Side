import { useCallback, useEffect, useState } from "react";
import { listInvoices } from "../api/invoiceApi";
import { mapPlatformInvoice } from "../api/invoiceModel";
import { interpretPlatformError } from "../api/platformErrors";

export function usePlatformInvoices({ tenantId, enabled = true } = {}) {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const reload = useCallback(async () => {
    if (!enabled) {
      setInvoices([]);
      setError("");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const body = await listInvoices({ status: "All", due: "All", tenantId });
      const rows = Array.isArray(body) ? body : [];
      setInvoices(rows.map(mapPlatformInvoice).filter(Boolean));
    } catch (err) {
      setInvoices([]);
      setError(interpretPlatformError(err).toast);
    } finally {
      setLoading(false);
    }
  }, [enabled, tenantId]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { invoices, loading, error, reload };
}

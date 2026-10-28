import { useCallback, useEffect, useState } from "react";
import { listInvoices } from "../api/invoiceApi";
import { readInvoiceList } from "../api/invoiceModel";
import { interpretPlatformError } from "../api/platformErrors";

export function usePlatformInvoices({ tenantId, enabled = true } = {}) {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [errorStatus, setErrorStatus] = useState(0);

  const reload = useCallback(async () => {
    if (!enabled) {
      setInvoices([]);
      setError("");
      setErrorStatus(0);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    setErrorStatus(0);
    try {
      const body = await listInvoices({ status: "All", due: "All", tenantId });
      const parsed = readInvoiceList(body);
      if (!parsed.ok) {
        setInvoices([]);
        setError(parsed.error);
        setErrorStatus(0);
        return;
      }
      setInvoices(parsed.rows);
      setError("");
      setErrorStatus(0);
    } catch (err) {
      setInvoices([]);
      setError(interpretPlatformError(err).toast);
      setErrorStatus(Number(err?.status) || 0);
    } finally {
      setLoading(false);
    }
  }, [enabled, tenantId]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { invoices, loading, error, errorStatus, reload };
}

import { useCallback, useEffect, useRef, useState } from "react";
import { listInvoices } from "../api/invoiceApi";
import { readInvoiceList } from "../api/invoiceModel";
import { interpretPlatformError, shouldEndPlatformSession } from "../api/platformErrors";
import { usePlatform } from "../context/PlatformContext";

/**
 * `portal` ends that portal's session after a rejected token.
 * Callers that omit it keep the previous behavior and do not sign anyone out.
 */
export function usePlatformInvoices({ tenantId, enabled = true, portal = "" } = {}) {
  const { signOutPortal } = usePlatform();
  const signOutRef = useRef(signOutPortal);
  signOutRef.current = signOutPortal;
  const requestRef = useRef(0);
  const endedRef = useRef(false);
  const scopeRef = useRef({ tenantId, enabled });
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [errorStatus, setErrorStatus] = useState(0);

  const reload = useCallback(async () => {
    const requestId = ++requestRef.current;
    const scopeChanged = scopeRef.current.tenantId !== tenantId || scopeRef.current.enabled !== enabled;
    scopeRef.current = { tenantId, enabled };
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
    if (scopeChanged) setInvoices([]);
    try {
      const body = await listInvoices({ status: "All", due: "All", tenantId });
      if (requestId !== requestRef.current) return;
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
      if (requestId !== requestRef.current) return;
      setInvoices([]);
      setError(interpretPlatformError(err).toast);
      setErrorStatus(Number(err?.status) || 0);
      if (portal && shouldEndPlatformSession(err) && !endedRef.current) {
        endedRef.current = true;
        signOutRef.current(portal);
      }
    } finally {
      if (requestId === requestRef.current) setLoading(false);
    }
  }, [enabled, portal, tenantId]);

  useEffect(() => {
    reload();
    return () => {
      requestRef.current += 1;
    };
  }, [reload]);

  return { invoices, loading, error, errorStatus, reload };
}

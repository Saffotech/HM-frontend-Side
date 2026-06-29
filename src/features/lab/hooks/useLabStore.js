import { useCallback, useEffect, useState } from 'react';
import {
  ensureMockLabDataLoaded,
  getLabOrders,
  getLabReports,
  getDoctorLabTests,
} from '@/features/lab/data/labStore';

const STORE_EVENT = 'lab-store-updated';

export function notifyLabStoreUpdated() {
  window.dispatchEvent(new Event(STORE_EVENT));
}

export function useLabOrders() {
  const [orders, setOrders] = useState([]);

  const refresh = useCallback(() => {
    setOrders(getLabOrders());
  }, []);

  useEffect(() => {
    let cancelled = false;
    ensureMockLabDataLoaded().then(() => {
      if (!cancelled) refresh();
    });
    window.addEventListener(STORE_EVENT, refresh);
    return () => {
      cancelled = true;
      window.removeEventListener(STORE_EVENT, refresh);
    };
  }, [refresh]);

  return { orders, refresh };
}

export function useLabReports() {
  const [reports, setReports] = useState([]);

  const refresh = useCallback(() => {
    setReports(getLabReports());
  }, []);

  useEffect(() => {
    let cancelled = false;
    ensureMockLabDataLoaded().then(() => {
      if (!cancelled) refresh();
    });
    window.addEventListener(STORE_EVENT, refresh);
    return () => {
      cancelled = true;
      window.removeEventListener(STORE_EVENT, refresh);
    };
  }, [refresh]);

  return { reports, refresh };
}

export function useDoctorLabTests() {
  const [tests, setTests] = useState([]);

  const refresh = useCallback(() => {
    setTests(getDoctorLabTests());
  }, []);

  useEffect(() => {
    let cancelled = false;
    ensureMockLabDataLoaded().then(() => {
      if (!cancelled) refresh();
    });
    window.addEventListener(STORE_EVENT, refresh);
    return () => {
      cancelled = true;
      window.removeEventListener(STORE_EVENT, refresh);
    };
  }, [refresh]);

  return { tests, refresh };
}

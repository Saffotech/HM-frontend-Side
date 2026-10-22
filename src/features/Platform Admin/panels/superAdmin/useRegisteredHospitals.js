import { useCallback, useEffect, useMemo, useSyncExternalStore } from "react";
import { interpretPlatformError } from "../../shared/api/platformErrors";
import { listTenants } from "../../shared/api/registrationApi";
import {
  confirmedActivations,
  reconcileConfirmedActivations,
  subscribeActivations,
  withConfirmedActivation,
} from "./tenantActivation";

let snapshot = { hospitals: [], loading: true, refreshing: false, error: "", refreshError: "", updatedAt: null };
let requestSerial = 0;
const listeners = new Set();

function publish(next) {
  snapshot = next;
  listeners.forEach((listener) => listener());
}

function subscribeHospitals(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getHospitalSnapshot() {
  return snapshot;
}

export function reloadRegisteredHospitals() {
  const request = ++requestSerial;
  publish({
    ...snapshot,
    loading: snapshot.hospitals.length === 0,
    refreshing: snapshot.hospitals.length > 0,
    error: "",
    refreshError: "",
  });
  return listTenants()
    .then((body) => {
      if (request !== requestSerial) return;
      if (!Array.isArray(body)) {
        const message = "Hospital list response was not a list.";
        publish(snapshot.hospitals.length > 0
          ? { ...snapshot, loading: false, refreshing: false, refreshError: message }
          : { ...snapshot, loading: false, refreshing: false, error: message, refreshError: "" });
        return;
      }
      const rows = body.slice().sort((left, right) => String(right.created_at || "").localeCompare(String(left.created_at || "")));
      publish({ hospitals: rows, loading: false, refreshing: false, error: "", refreshError: "", updatedAt: Date.now() });
      reconcileConfirmedActivations(rows);
    })
    .catch((err) => {
      if (request !== requestSerial) return;
      const message = interpretPlatformError(err).toast || "Hospitals could not be loaded.";
      publish(snapshot.hospitals.length > 0
        ? { ...snapshot, loading: false, refreshing: false, refreshError: message }
        : { ...snapshot, loading: false, refreshing: false, error: message, refreshError: "" });
    });
}

export function useRegisteredHospitals() {
  const current = useSyncExternalStore(subscribeHospitals, getHospitalSnapshot, getHospitalSnapshot);
  const flags = useSyncExternalStore(subscribeActivations, confirmedActivations, confirmedActivations);
  const hospitals = useMemo(
    () => withConfirmedActivation(current.hospitals, flags),
    [current.hospitals, flags],
  );
  const reload = useCallback(() => reloadRegisteredHospitals(), []);

  useEffect(() => {
    reloadRegisteredHospitals();
  }, []);

  return {
    hospitals,
    loading: current.loading,
    refreshing: current.refreshing,
    error: current.error,
    refreshError: current.refreshError,
    updatedAt: current.updatedAt,
    reload,
  };
}

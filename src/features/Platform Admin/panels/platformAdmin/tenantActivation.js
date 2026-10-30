let confirmed = {};
const listeners = new Set();

function emit() {
  listeners.forEach((listener) => listener());
}

export function confirmedActivations() {
  return confirmed;
}

export function subscribeActivations(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Remember a suspend/reactivate response. Invalid payloads are ignored. */
export function applyConfirmedTenantActivation(summary) {
  if (!summary || summary.tenant_id == null || typeof summary.is_active !== "boolean") return false;
  const key = String(summary.tenant_id);
  if (confirmed[key] === summary.is_active) return true;
  confirmed = { ...confirmed, [key]: summary.is_active };
  emit();
  return true;
}

export function withConfirmedActivation(hospitals, flags = confirmed) {
  const source = flags && typeof flags === "object" ? flags : {};
  return (Array.isArray(hospitals) ? hospitals : []).map((hospital) => {
    if (!hospital || hospital.tenant_id == null) return hospital;
    const key = String(hospital.tenant_id);
    if (!Object.prototype.hasOwnProperty.call(source, key)) return hospital;
    const isActive = source[key];
    if (typeof isActive !== "boolean" || hospital.is_active === isActive) return hospital;
    return { ...hospital, is_active: isActive };
  });
}

/** Drop a confirmation once the hospital list reports the same is_active. */
export function reconcileConfirmedActivations(hospitals) {
  if (!Array.isArray(hospitals) || Object.keys(confirmed).length === 0) return false;
  const next = { ...confirmed };
  let changed = false;
  hospitals.forEach((hospital) => {
    if (!hospital || hospital.tenant_id == null) return;
    const key = String(hospital.tenant_id);
    if (!Object.prototype.hasOwnProperty.call(next, key)) return;
    if (hospital.is_active === next[key]) {
      delete next[key];
      changed = true;
    }
  });
  if (!changed) return false;
  confirmed = next;
  emit();
  return true;
}

export function resetConfirmedActivations() {
  confirmed = {};
  emit();
}

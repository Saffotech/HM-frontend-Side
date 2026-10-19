/** In-memory hospital scope for browser storage. Not persisted. */

let scope = { tenantId: null, userId: null };

export function setHospitalStorageScope(identity) {
  if (!identity) {
    scope = { tenantId: null, userId: null };
    return scope;
  }
  const tenantId = identity.tenantId ?? identity.tenant_id ?? null;
  const userId = identity.userId ?? identity.user_id ?? identity.id ?? null;
  scope = {
    tenantId: tenantId == null || tenantId === '' ? null : tenantId,
    userId: userId == null || userId === '' ? null : userId,
  };
  return scope;
}

export function getHospitalStorageScope() {
  return scope;
}

import {
  leadRegisterBody,
  mapRegistration,
  tenantRegisterBody,
} from "./hospitalRegistration.js";
import { platformApi } from "./platformClient.js";

export function registerTenant(values) {
  return platformApi("/tenants", {
    method: "POST",
    body: JSON.stringify(tenantRegisterBody(values)),
  });
}

export function listTenants() {
  return platformApi("/tenants");
}

export function getTenant(tenantId) {
  return platformApi(`/tenants/${encodeURIComponent(tenantId)}`);
}

/** PATCH /tenants/{tenant_id}/active — response is TenantSummary, including is_active. */
export function setTenantActive(tenantId, isActive) {
  return platformApi(`/tenants/${encodeURIComponent(tenantId)}/active`, {
    method: "PATCH",
    body: JSON.stringify({ is_active: Boolean(isActive) }),
  });
}

export function listRegistrations(status) {
  return platformApi(`/platform/registrations?status=${encodeURIComponent(status)}`);
}

export function getRegistration(leadId) {
  return platformApi(`/platform/registrations/${leadId}`);
}

export async function registerFromLead(leadId, values) {
  const body = await platformApi(`/platform/registrations/${leadId}/register`, {
    method: "POST",
    body: JSON.stringify(leadRegisterBody(values)),
  });
  return mapRegistration(body);
}

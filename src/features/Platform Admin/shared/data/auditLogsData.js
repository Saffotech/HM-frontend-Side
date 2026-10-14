export const auditLogsSeed = [
  log("AUD-3107", "2026-10-06T09:12:00", "Priya Nair", "Invoice Issued", "Greenfield Community Hospital", "INV-2026-1009", "Success"),
  log("AUD-3106", "2026-10-06T08:20:00", "System", "Payment Failed", "Harmony Women's Hospital", "INV-2026-1007", "Failed"),
  log("AUD-3104", "2026-10-05T15:44:00", "Saffo Admin", "Tenant Suspended", "Crescent Maternity", "TNT-1015", "Success"),
  log("AUD-3103", "2026-10-04T11:18:00", "Saffo Admin", "Hospital Registered", "Westbridge Healthcare", "TNT-1018", "Success"),
  log("AUD-3088", "2026-09-12T14:12:00", "Meera Iyer", "Tenant Activated", "Harborview Medical", "TNT-1014", "Success"),
  log("AUD-3055", "2026-08-08T09:40:00", "Priya Nair", "Subscription Suspended", "Bluewater Diagnostics", "TNT-1010", "Success"),
];

function log(id, timestamp, actor, action, tenant, resource, result) {
  return { id, timestamp, actor, action, tenant, resource, result };
}

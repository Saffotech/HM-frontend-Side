/** Map GET /super-admin/audit entries to UI row shape */

export function mapAuditEntry(entry) {
  return {
    id: entry.id,
    timestamp: entry.created_at,
    actor: entry.actor_email || '—',
    action: entry.action || '—',
    target: entry.summary || '—',
    target_type: entry.resource_type || '—',
    ip: entry.ip_address || '—',
    actor_role: entry.actor_role || null,
    resource_id: entry.resource_id ?? null,
  };
}

export function mapAuditResponse(response) {
  const entries = response?.entries ?? [];
  return {
    total: response?.total ?? entries.length,
    page: response?.page ?? 1,
    limit: response?.limit ?? entries.length,
    entries: entries.map(mapAuditEntry),
  };
}

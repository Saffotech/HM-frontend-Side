export function formatRoleLabel(name) {
  if (!name) return '—';
  if (name === 'super_admin') return 'Admin';
  if (name === 'admin') return 'Manager';
  if (name === 'opd_billing') return 'OPD Billing';
  if (name === 'ipd') return 'IPD';
  if (name === 'lab_technician') return 'Lab Technician';
  return name.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Mock audit log — replace with GET /super-admin/audit when live */

const MOCK_DELAY = 400;

const MOCK_LOGS = [
  { id: 1, timestamp: '2025-07-06T09:14:02Z', actor: 'super_admin@hospital.org', action: 'REGISTER_USER', target: 'dr.emily.chen@hospital.org', target_type: 'User', ip: '192.168.1.10' },
  { id: 2, timestamp: '2025-07-06T09:02:45Z', actor: 'admin@hospital.org', action: 'ACTIVATE_USER', target: 'nurse.james@hospital.org', target_type: 'User', ip: '192.168.1.14' },
  { id: 3, timestamp: '2025-07-06T08:55:11Z', actor: 'super_admin@hospital.org', action: 'CREATE_ROLE', target: 'Head Pharmacist', target_type: 'Role', ip: '192.168.1.10' },
  { id: 4, timestamp: '2025-07-06T08:44:33Z', actor: 'super_admin@hospital.org', action: 'ASSIGN_PERMISSIONS', target: 'Doctor', target_type: 'Role', ip: '192.168.1.10' },
  { id: 5, timestamp: '2025-07-05T17:31:09Z', actor: 'admin@hospital.org', action: 'UPDATE_USER', target: 'tech.sara@hospital.org', target_type: 'User', ip: '192.168.1.14' },
  { id: 6, timestamp: '2025-07-05T16:20:55Z', actor: 'admin@hospital.org', action: 'DEACTIVATE_USER', target: 'intern.john@hospital.org', target_type: 'User', ip: '192.168.1.14' },
  { id: 7, timestamp: '2025-07-05T14:08:44Z', actor: 'super_admin@hospital.org', action: 'UPDATE_SETTINGS', target: 'Hospital Profile', target_type: 'Settings', ip: '192.168.1.10' },
];

export async function getAuditLogs({ actor = '', dateFrom = '', dateTo = '' } = {}) {
  await new Promise((r) => setTimeout(r, MOCK_DELAY));
  let result = [...MOCK_LOGS];
  if (actor) {
    result = result.filter((l) => l.actor.toLowerCase().includes(actor.toLowerCase()));
  }
  if (dateFrom) {
    result = result.filter((l) => l.timestamp.slice(0, 10) >= dateFrom);
  }
  if (dateTo) {
    result = result.filter((l) => l.timestamp.slice(0, 10) <= dateTo);
  }
  return result;
}

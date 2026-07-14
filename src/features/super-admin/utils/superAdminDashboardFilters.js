export const DASHBOARD_FILTERS = {
  TOTAL_STAFF: 'total_staff',
  ACTIVE_STAFF: 'active_staff',
  TOTAL_ROLES: 'total_roles',
  TODAY_EVENTS: 'today_events',
};

export const DASHBOARD_FILTER_META = {
  [DASHBOARD_FILTERS.TOTAL_STAFF]: {
    tableTitle: 'All staff',
    emptyMessage: 'No staff records found.',
    searchPlaceholder: 'Search by name, email, role, department…',
    noResultsMessage: 'No staff match your search.',
    columns: [
      { key: 'name', label: 'Name' },
      { key: 'email', label: 'Email' },
      { key: 'role', label: 'Role' },
      { key: 'department', label: 'Department' },
      { key: 'status', label: 'Status' },
    ],
  },
  [DASHBOARD_FILTERS.ACTIVE_STAFF]: {
    tableTitle: 'Active staff',
    emptyMessage: 'No active staff found.',
    searchPlaceholder: 'Search by name, email, role, department…',
    noResultsMessage: 'No active staff match your search.',
    columns: [
      { key: 'name', label: 'Name' },
      { key: 'email', label: 'Email' },
      { key: 'role', label: 'Role' },
      { key: 'department', label: 'Department' },
      { key: 'joined', label: 'Joined' },
    ],
  },
  [DASHBOARD_FILTERS.TOTAL_ROLES]: {
    tableTitle: 'System roles',
    emptyMessage: 'No roles defined.',
    searchPlaceholder: 'Search by role name or description…',
    noResultsMessage: 'No roles match your search.',
    columns: [
      { key: 'role', label: 'Role' },
      { key: 'description', label: 'Description' },
      { key: 'staffCount', label: 'Staff assigned' },
    ],
  },
  [DASHBOARD_FILTERS.TODAY_EVENTS]: {
    tableTitle: "Today's audit events",
    emptyMessage: 'No audit events recorded today.',
    searchPlaceholder: 'Search by actor, action, target…',
    noResultsMessage: 'No events match your search.',
    columns: [
      { key: 'time', label: 'Time' },
      { key: 'actor', label: 'Actor' },
      { key: 'action', label: 'Action' },
      { key: 'target', label: 'Target' },
    ],
  },
};

function staffDisplayName(user) {
  if (user.full_name) return user.full_name;
  return `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email || '—';
}

function formatJoinedDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatAuditTime(value) {
  if (!value) return '—';
  return new Date(value).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatRoleLabel(name) {
  if (!name) return '—';
  return name.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function buildStaffRows(staff = [], { activeOnly = false } = {}) {
  const rows = activeOnly ? staff.filter((s) => s.is_active) : staff;
  return rows.map((user) => ({
    id: user.id,
    name: staffDisplayName(user),
    email: user.email || '—',
    role: user.role_name || user.role || '—',
    department: user.department_name || user.department || '—',
    status: user.is_active ? 'Active' : 'Inactive',
    joined: formatJoinedDate(user.created_at),
    isActive: Boolean(user.is_active),
  }));
}

export function buildRoleRows(roles = [], staffByRole = []) {
  const counts = Array.isArray(staffByRole) && staffByRole.length
    ? staffByRole.reduce((acc, row) => {
        if (row.role_name) acc[row.role_name] = row.count ?? 0;
        return acc;
      }, {})
    : {};

  return roles.map((role) => ({
    id: role.id,
    role: role.name,
    description:
      role.description
      || (Array.isArray(role.permissions) && role.permissions.length > 0
        ? `${role.permissions.length} permissions`
        : '—'),
    staffCount: counts[role.name] ?? 0,
  }));
}

export function buildAuditRows(logs = []) {
  return logs.map((log) => ({
    id: log.id,
    time: formatAuditTime(log.timestamp),
    actor: log.actor || '—',
    action: log.action?.replace(/_/g, ' ') || '—',
    target: log.target || '—',
    actionKey: log.action,
  }));
}

export function getDashboardTableRows(
  filter,
  { staff = [], roles = [], auditLogs = [], staffByRole = [] } = {},
) {
  switch (filter) {
    case DASHBOARD_FILTERS.ACTIVE_STAFF:
      return buildStaffRows(staff);
    case DASHBOARD_FILTERS.TOTAL_ROLES:
      return buildRoleRows(roles, staffByRole);
    case DASHBOARD_FILTERS.TODAY_EVENTS:
      return buildAuditRows(auditLogs);
    case DASHBOARD_FILTERS.TOTAL_STAFF:
    default:
      return buildStaffRows(staff);
  }
}

const SEARCH_SKIP_KEYS = new Set(['id', 'isActive', 'actionKey']);

export function filterDashboardTableRows(rows, query) {
  const term = query.trim().toLowerCase();
  if (!term) return rows;

  return rows.filter((row) =>
    Object.entries(row).some(([key, value]) => {
      if (SEARCH_SKIP_KEYS.has(key)) return false;
      return String(value ?? '').toLowerCase().includes(term);
    }),
  );
}

export { formatRoleLabel };

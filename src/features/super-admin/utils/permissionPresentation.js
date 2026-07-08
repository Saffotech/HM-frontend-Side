import {
  ClipboardList,
  FileText,
  FlaskConical,
  Shield,
  Stethoscope,
  UserCog,
  Users,
} from 'lucide-react';
import { formatRoleLabel } from '@/features/admin/components/AdminRoleBadge';

const ACTION_LABELS = {
  view: 'View',
  create: 'Create',
  edit: 'Edit',
  update: 'Update',
  delete: 'Delete',
  manage: 'Manage',
  assign: 'Assign',
  approve: 'Approve',
  export: 'Export',
};

const RESOURCE_LABELS = {
  patients: 'patient records',
  opd: 'OPD',
  prescriptions: 'prescriptions',
  lab: 'lab reports',
  users: 'staff accounts',
  roles: 'roles',
  audit: 'audit logs',
  billing: 'billing',
  pharmacy: 'pharmacy',
  appointments: 'appointments',
};

const PERMISSION_META = {
  'patients:view': {
    label: 'View patient records',
    description: 'See patient lists, profiles, and medical history.',
  },
  'patients:create': {
    label: 'Register new patients',
    description: 'Add new patients and update basic registration details.',
  },
  'opd:view': {
    label: 'Access OPD workspace',
    description: 'Open OPD queues, visits, and outpatient workflows.',
  },
  'prescriptions:create': {
    label: 'Write prescriptions',
    description: 'Create and issue prescriptions for patients.',
  },
  'lab:view': {
    label: 'View lab orders & reports',
    description: 'See pending tests and completed laboratory reports.',
  },
  'users:view': {
    label: 'View staff directory',
    description: 'Browse hospital staff and their account status.',
  },
  'roles:view': {
    label: 'View role definitions',
    description: 'See which roles exist and what they are used for.',
  },
  'audit:view': {
    label: 'View system activity log',
    description: 'Review who changed settings, users, and permissions.',
  },
};

const GROUP_META = {
  patients: {
    label: 'Patient management',
    description: 'Control access to patient registration and records.',
    icon: Users,
  },
  opd: {
    label: 'OPD & outpatient care',
    description: 'Permissions for front-desk and outpatient workflows.',
    icon: Stethoscope,
  },
  prescriptions: {
    label: 'Prescriptions',
    description: 'Clinical prescribing and medication orders.',
    icon: FileText,
  },
  lab: {
    label: 'Laboratory',
    description: 'Lab orders, sample tracking, and reports.',
    icon: FlaskConical,
  },
  users: {
    label: 'Staff & users',
    description: 'Hospital employee accounts and profiles.',
    icon: UserCog,
  },
  roles: {
    label: 'Roles & access',
    description: 'Role setup and permission visibility.',
    icon: Shield,
  },
  audit: {
    label: 'Audit & compliance',
    description: 'Activity history and accountability.',
    icon: ClipboardList,
  },
  other: {
    label: 'Other permissions',
    description: 'Additional system capabilities.',
    icon: Shield,
  },
};

const GROUP_ORDER = [
  'patients',
  'opd',
  'prescriptions',
  'lab',
  'users',
  'roles',
  'audit',
  'other',
];

function titleCase(value) {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function fallbackPermissionMeta(name) {
  const [resource = 'system', action = 'access'] = String(name).split(':');
  const actionLabel = ACTION_LABELS[action] || titleCase(action);
  const resourceLabel = RESOURCE_LABELS[resource] || titleCase(resource);

  return {
    label: `${actionLabel} ${resourceLabel}`,
    description: `Allows this role to ${actionLabel.toLowerCase()} ${resourceLabel.toLowerCase()}.`,
    group: resource,
  };
}

export function getPermissionDisplay(permission) {
  const name = permission?.name || '';
  const known = PERMISSION_META[name];
  const fallback = fallbackPermissionMeta(name);
  const group = known?.group || fallback.group || 'other';

  return {
    id: permission.id,
    name,
    label: known?.label || fallback.label,
    description: known?.description || fallback.description,
    group,
    groupLabel: GROUP_META[group]?.label || GROUP_META.other.label,
    groupDescription: GROUP_META[group]?.description || GROUP_META.other.description,
    groupIcon: GROUP_META[group]?.icon || GROUP_META.other.icon,
  };
}

export function groupPermissions(catalog = []) {
  const groups = new Map();

  catalog.forEach((permission) => {
    const display = getPermissionDisplay(permission);
    if (!groups.has(display.group)) {
      groups.set(display.group, {
        id: display.group,
        label: display.groupLabel,
        description: display.groupDescription,
        icon: display.groupIcon,
        permissions: [],
      });
    }
    groups.get(display.group).permissions.push(display);
  });

  return GROUP_ORDER
    .filter((id) => groups.has(id))
    .map((id) => groups.get(id))
    .concat(
      [...groups.keys()]
        .filter((id) => !GROUP_ORDER.includes(id))
        .map((id) => groups.get(id)),
    );
}

export { formatRoleLabel };

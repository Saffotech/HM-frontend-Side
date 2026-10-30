/** Authorized module of the screen the user is in. Never derived from source_module. */

export const NOTIFICATION_MODULE = {
  NURSE: 'nurse',
  DOCTOR: 'doctor',
  PHARMACY: 'pharmacy',
  LAB: 'lab',
  OPD: 'opd',
  RECEPTIONIST: 'receptionist',
  MANAGER: 'manager',
};

const PREFIX_MODULES = [
  ['/nurse', NOTIFICATION_MODULE.NURSE],
  ['/doctor', NOTIFICATION_MODULE.DOCTOR],
  ['/pharmacy', NOTIFICATION_MODULE.PHARMACY],
  ['/lab', NOTIFICATION_MODULE.LAB],
  ['/receptionist', NOTIFICATION_MODULE.RECEPTIONIST],
  ['/manager', NOTIFICATION_MODULE.MANAGER],
];

const OPD_PREFIXES = [
  '/dashboard',
  '/billing',
  '/appointments',
  '/patients',
  '/opd',
  '/pricing',
  '/payment-history',
];

export function detectNotificationModule(pathname) {
  const path = String(pathname || '');
  for (const [prefix, module] of PREFIX_MODULES) {
    if (path === prefix || path.startsWith(`${prefix}/`)) return module;
  }
  if (OPD_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))) {
    return NOTIFICATION_MODULE.OPD;
  }
  return null;
}

const MODULE_PREFIXES = {
  [NOTIFICATION_MODULE.NURSE]: ['/nurse'],
  [NOTIFICATION_MODULE.DOCTOR]: ['/doctor'],
  [NOTIFICATION_MODULE.PHARMACY]: ['/pharmacy'],
  [NOTIFICATION_MODULE.LAB]: ['/lab'],
  [NOTIFICATION_MODULE.RECEPTIONIST]: ['/receptionist'],
  [NOTIFICATION_MODULE.MANAGER]: ['/manager'],
  [NOTIFICATION_MODULE.OPD]: OPD_PREFIXES,
};

export function isDestinationInModule(module, pathname) {
  const prefixes = MODULE_PREFIXES[module];
  if (!prefixes) return false;
  const path = String(pathname || '');
  return prefixes.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}

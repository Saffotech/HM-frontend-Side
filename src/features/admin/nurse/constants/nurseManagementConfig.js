/**
 * Nurse Access Control toggles — only permissions that nurse module UI/APIs use.
 * Admin-only keys (bed_allocation, workforce, roster) and unused keys (lab:view,
 * handover) are intentionally excluded.
 */
export const PERMISSION_GROUPS = [
  {
    module: 'Patients',
    permissions: [
      {
        key: 'patients:view',
        name: 'View Patients',
        description: 'Allow staff to view patient records assigned to nurse workflows.',
      },
      {
        key: 'opd:view',
        name: 'View Dashboard & Duty',
        description: 'Allow nurse dashboard, My Duty, queue, and bed assignment context.',
      },
    ],
  },
  {
    module: 'Vitals',
    permissions: [
      { key: 'nurse_vitals:view', name: 'View Vitals', description: 'View patient vital entries.' },
      { key: 'nurse_vitals:create', name: 'Create Vitals', description: 'Record new vital readings.' },
      { key: 'nurse_vitals:update', name: 'Update Vitals', description: 'Edit existing vital records.' },
    ],
  },
  {
    module: 'Nursing Notes',
    permissions: [
      { key: 'nurse_notes:view', name: 'View Notes', description: 'View nurse clinical notes.' },
      { key: 'nurse_notes:create', name: 'Create Notes', description: 'Create new nursing notes.' },
      { key: 'nurse_notes:update', name: 'Update Notes', description: 'Edit nursing notes.' },
    ],
  },
  {
    module: 'Lab Reports',
    permissions: [
      {
        key: 'nurse_lab_reports:view',
        name: 'View Lab Reports',
        description: 'View and download completed lab reports for occupied-bed patients.',
      },
    ],
  },
  {
    module: 'Medication',
    permissions: [
      { key: 'nurse_medication:view', name: 'View Medication', description: 'View medication tasks and history.' },
      { key: 'nurse_medication:create', name: 'Create Medication Logs', description: 'Log medication administration.' },
      { key: 'nurse_medication:update', name: 'Update Medication Logs', description: 'Update administered medication records.' },
    ],
  },
  {
    module: 'Emergency Alerts',
    permissions: [
      {
        key: 'emergency_alerts:view',
        name: 'View Alerts',
        description: 'List, summary, and alert detail (GET /nurse/alerts).',
      },
      {
        key: 'emergency_alerts:create',
        name: 'Create Alerts',
        description: 'Raise a new emergency alert (POST /nurse/alerts).',
      },
      {
        key: 'emergency_alerts:update',
        name: 'Update Alerts',
        description: 'Resolve an active alert (PUT /nurse/alerts/{id}/resolve).',
      },
    ],
  },
  {
    module: 'Profile',
    permissions: [
      { key: 'nurse_profile:view', name: 'View Profile', description: 'View nurse profile details.' },
      { key: 'nurse_profile:update', name: 'Update Profile', description: 'Edit nurse profile details.' },
      { key: 'nurse_profile:upload_image', name: 'Upload Profile Image', description: 'Upload nurse profile image.' },
      { key: 'nurse_profile:delete_image', name: 'Delete Profile Image', description: 'Delete nurse profile image.' },
    ],
  },
  {
    module: 'Notifications',
    permissions: [
      { key: 'notifications:view', name: 'View Notifications', description: 'View nurse notifications.' },
      { key: 'notifications:update', name: 'Update Notifications', description: 'Mark or update notifications.' },
    ],
  },
];

export const NURSE_PERMISSION_KEYS = PERMISSION_GROUPS.flatMap((group) => group.permissions);

export const NURSE_REPORTS = [
  'Daily Nurse Report',
  'Shift Report',
  'Vitals Completion',
  'Medication Compliance',
  'Nursing Notes',
  'Emergency Alerts',
];

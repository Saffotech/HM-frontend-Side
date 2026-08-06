/**
 * Doctor Access Control toggles — only permissions that doctor FE uses.
 * Excluded (no doctor FE): opd:view, appointments:create, prescriptions:view.
 */
export const PERMISSION_GROUPS = [
  {
    module: 'Appointments & Dashboard',
    permissions: [
      {
        key: 'appointments:view',
        name: 'View Appointments & Dashboard',
        description:
          'Dashboard, Calendar, today’s list, and appointment queues (GET appointments / queue).',
      },
    ],
  },
  {
    module: 'Patients',
    permissions: [
      {
        key: 'patients:view',
        name: 'View Patients / EMR',
        description: 'Open patient EMR and history from doctor screens.',
      },
    ],
  },
  {
    module: 'Consultations',
    permissions: [
      {
        key: 'appointments:update',
        name: 'Consult & Update Appointments',
        description:
          'Start consultation, save clinical notes, and cancel appointments when allowed.',
      },
    ],
  },
  {
    module: 'Prescriptions',
    permissions: [
      {
        key: 'prescriptions:create',
        name: 'Create Prescriptions',
        description: 'Write / save new prescriptions from consultation or quick prescribe.',
      },
      {
        key: 'prescriptions:update',
        name: 'Update Prescriptions',
        description: 'Edit existing prescriptions.',
      },
      {
        key: 'prescriptions:delete',
        name: 'Delete Prescriptions',
        description: 'Delete prescriptions from patient history.',
      },
    ],
  },
  {
    module: 'Lab Tests',
    permissions: [
      {
        key: 'lab:view',
        name: 'View Lab Tests',
        description: 'Lab Tests list and reports.',
      },
      {
        key: 'lab:create',
        name: 'Order / Update Lab Tests',
        description: 'Create, edit, or cancel lab orders from consultation or Labs.',
      },
    ],
  },
  {
    module: 'Profile',
    permissions: [
      {
        key: 'doctor_profile:view',
        name: 'View Profile',
        description: 'Open My Profile (GET /doctor/profile).',
      },
      {
        key: 'doctor_profile:update',
        name: 'Update Profile',
        description: 'Edit and save profile fields (PUT /doctor/profile).',
      },
      {
        key: 'doctor_profile:upload_image',
        name: 'Upload Profile Image',
        description: 'Upload profile photo (POST /doctor/profile/image).',
      },
      {
        key: 'doctor_profile:delete_image',
        name: 'Delete Profile Image',
        description: 'Remove profile photo (DELETE /doctor/profile/image).',
      },
    ],
  },
  {
    module: 'Notifications',
    permissions: [
      {
        key: 'notifications:view',
        name: 'View Notifications',
        description: 'Bell preview and Notifications inbox.',
      },
      {
        key: 'notifications:update',
        name: 'Update Notifications',
        description: 'Mark notifications as read / mark all read.',
      },
    ],
  },
];

export const DOCTOR_PERMISSION_KEYS = PERMISSION_GROUPS.flatMap((group) => group.permissions);

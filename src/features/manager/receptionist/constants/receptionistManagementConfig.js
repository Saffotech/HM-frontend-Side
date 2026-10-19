/**
 * Receptionist Access Control toggles — only permissions that receptionist FE uses.
 * Excluded: patients:view (seeded but no receptionist FE), legacy check-in/call/export (no FE).
 */
export const PERMISSION_GROUPS = [
  {
    module: 'Queues & Dashboard',
    permissions: [
      {
        key: 'receptionist:view_queues',
        name: 'View Queues & Dashboard',
        description:
          'Dashboard, Today’s Queue, Doctor Queues, and Queue History (GET /receptionist/*).',
      },
    ],
  },
  {
    module: 'Doctor Schedule',
    permissions: [
      {
        key: 'receptionist:view_doctor_schedule',
        name: 'View Doctor Schedule',
        description:
          'Doctor list, filters, and today’s schedule slots (GET /receptionist/doctors/schedule).',
      },
    ],
  },
  {
    module: 'Profile',
    permissions: [
      {
        key: 'receptionist_profile:view',
        name: 'View Profile',
        description: 'Open My Profile (GET /receptionist/profile).',
      },
      {
        key: 'receptionist_profile:update',
        name: 'Update Profile',
        description: 'Edit and save profile fields (PUT /receptionist/profile).',
      },
      {
        key: 'receptionist_profile:upload_image',
        name: 'Upload Profile Image',
        description: 'Upload profile photo (POST /receptionist/profile/image).',
      },
      {
        key: 'receptionist_profile:delete_image',
        name: 'Delete Profile Image',
        description: 'Remove profile photo (DELETE /receptionist/profile/image).',
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

export const RECEPTIONIST_PERMISSION_KEYS = PERMISSION_GROUPS.flatMap(
  (group) => group.permissions,
);

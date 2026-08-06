/**
 * Pharmacy Access Control toggles — only permissions that pharmacy FE uses.
 * Excluded: patients:view (seeded historically; allergies ride on prescription payloads).
 */
export const PERMISSION_GROUPS = [
  {
    module: 'Prescriptions',
    permissions: [
      {
        key: 'prescriptions:view',
        name: 'View Prescriptions & History',
        description:
          'Prescription list, detail, and dispense history (GET /pharmacy/prescriptions, /history).',
      },
    ],
  },
  {
    module: 'Dispense',
    permissions: [
      {
        key: 'prescriptions:dispense',
        name: 'Dispense Medicines',
        description: 'Dispense flow and confirm action (POST /pharmacy/dispense/{id}).',
      },
    ],
  },
  {
    module: 'Profile',
    permissions: [
      {
        key: 'pharmacist_profile:view',
        name: 'View Profile',
        description: 'Open My Profile (GET /pharmacy/profile).',
      },
      {
        key: 'pharmacist_profile:update',
        name: 'Update Profile',
        description: 'Edit and save profile fields (PUT /pharmacy/profile).',
      },
      {
        key: 'pharmacist_profile:upload_image',
        name: 'Upload Profile Image',
        description: 'Upload profile photo (POST /pharmacy/profile/image).',
      },
      {
        key: 'pharmacist_profile:delete_image',
        name: 'Delete Profile Image',
        description: 'Remove profile photo (DELETE /pharmacy/profile/image).',
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

export const PHARMACY_PERMISSION_KEYS = PERMISSION_GROUPS.flatMap(
  (group) => group.permissions,
);

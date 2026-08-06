/**
 * LAB Access Control toggles — only permissions that lab technician FE uses.
 * Excluded: patients:view (no lab FE), lab:create (doctor-owned order creation).
 */
export const PERMISSION_GROUPS = [
  {
    module: 'Orders & Reports',
    permissions: [
      {
        key: 'lab:view',
        name: 'View Orders & Reports',
        description:
          'Dashboard, Pending Tests, Report Archive, and order/report detail (GET /lab/*).',
      },
    ],
  },
  {
    module: 'Results Workflow',
    permissions: [
      {
        key: 'lab:update',
        name: 'Update Test Workflow',
        description:
          'Sample collected, processing, and complete steps (PATCH /lab/orders/{id}/*).',
      },
      {
        key: 'lab:upload_report',
        name: 'Upload Lab Reports',
        description:
          'Create report results and upload files (POST /lab/orders/{id}/report, upload-file).',
      },
    ],
  },
  {
    module: 'Profile',
    permissions: [
      {
        key: 'lab_technician_profile:view',
        name: 'View Profile',
        description: 'Open My Profile (GET /lab/profile).',
      },
      {
        key: 'lab_technician_profile:update',
        name: 'Update Profile',
        description: 'Edit and save profile fields (PUT /lab/profile).',
      },
      {
        key: 'lab_technician_profile:upload_image',
        name: 'Upload Profile Image',
        description: 'Upload profile photo (POST /lab/profile/image).',
      },
      {
        key: 'lab_technician_profile:delete_image',
        name: 'Delete Profile Image',
        description: 'Remove profile photo (DELETE /lab/profile/image).',
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

export const LAB_PERMISSION_KEYS = PERMISSION_GROUPS.flatMap((group) => group.permissions);

/** TanStack Query key factory — shared across OPD and doctor features */



export const queryKeys = {

  patients: {

    all: ['patients'],

    list: (filters) => ['patients', 'list', filters],

    detail: (id) => ['patients', id],

    profile: (dbId) => ['patients', 'profile', dbId],

    searchPhone: (phone) => ['patients', 'search-phone', phone],

  },

  appointments: {

    all: ['appointments'],

    list: (filters) => ['appointments', 'list', filters],

    today: ['appointments', 'today'],

    doctorSlots: (doctorId, deptId, date) => ['appointments', 'slots', doctorId, deptId, date],

    detail: (id) => ['appointments', id],

  },

  bills: {

    all: ['bills'],

    list: (filters) => ['bills', 'list', filters],

    detail: (id) => ['bills', id],

    invoice: (visitId) => ['bills', 'invoice', visitId],

    payments: ['bills', 'payments'],

    paymentHistory: (filters) => ['bills', 'payment-history', filters],

  },

  beds: {

    all: ['beds'],

    list: (filters) => ['beds', 'list', filters],

  },

  opd: {

    departments: ['opd', 'departments'],
    labDepartments: ['opd', 'departments', 'lab-routing'],

    doctors: (departmentId) => ['opd', 'doctors', departmentId],

    dashboard: ['opd', 'dashboard'],

    settings: ['opd', 'settings'],

    profile: ['opd', 'profile'],

    notifications: ['opd', 'notifications'],

    notificationsList: (filters) => ['opd', 'notifications', 'list', filters],

    notificationsUnreadCount: ['opd', 'notifications', 'unread-count'],

  },

  pharmacy: {
    all: ['pharmacy'],
    prescriptions: (filters) => ['pharmacy', 'prescriptions', filters],
    prescription: (id) => ['pharmacy', 'prescription', id],
    history: (params) => ['pharmacy', 'history', params],
    prescriptionHistory: (id) => ['pharmacy', 'prescription-history', id],
    profile: ['pharmacy', 'profile'],
    notifications: ['pharmacy', 'notifications'],
    notificationsList: (filters) => ['pharmacy', 'notifications', 'list', filters],
    notificationsUnreadCount: ['pharmacy', 'notifications', 'unread-count'],
  },

  nurse: {
    all: ['nurse'],
    myDuty: ['nurse', 'my-duty'],
    queue: (filters) => ['nurse', 'queue', filters],
    bedPatients: (filters) => ['nurse', 'bed-patients', filters],
    bedAllocationSummary: (filters = {}) => ['nurse', 'bed-allocation-summary', filters],
    patientAppointment: (patientId) => ['nurse', 'patient-appointment', patientId],
    vitals: (filters) => ['nurse', 'vitals', filters],
    vitalsSearch: (filters) => ['nurse', 'vitals-search', filters],
    vital: (id) => ['nurse', 'vital', id],
    notes: (filters) => ['nurse', 'notes', filters],
    notesSearch: (filters) => ['nurse', 'notes-search', filters],
    note: (id) => ['nurse', 'note', id],
    medicationPatients: (filters) => ['nurse', 'medication-patients', filters],
    patientMedications: (patientId) => ['nurse', 'patient-medications', patientId],
    medicationHistory: (filters) => ['nurse', 'medication-history', filters],
    patientMedHistory: (patientId) => ['nurse', 'patient-med-history', patientId],
    handovers: (filters) => ['nurse', 'handovers', filters],
    handover: (id) => ['nurse', 'handover', id],
    alerts: (filters) => ['nurse', 'alerts', filters],
    alertSummary: (filters = {}) => ['nurse', 'alert-summary', filters],
    alert: (id) => ['nurse', 'alert', id],
    doctorVisits: (filters) => ['nurse', 'doctor-visits', filters],
    doctorVisitsDoctors: (filters = {}) => ['nurse', 'doctor-visits', 'doctors', filters],
    doctorVisitsDepartments: (filters = {}) => ['nurse', 'doctor-visits', 'departments', filters],
    labReports: (filters) => ['nurse', 'lab-reports', filters],
    labReport: (id, filters = {}) => ['nurse', 'lab-reports', 'detail', id, filters],
    // Nurse Phase 2 by Atharva — profile + notifications cache keys
    profile: ['nurse', 'profile'],
    notifications: ['nurse', 'notifications'],
    notificationsList: (filters) => ['nurse', 'notifications', 'list', filters],
    notificationsUnreadCount: ['nurse', 'notifications', 'unread-count'],
  },

  admin: {
    all: ['admin'],
    dashboard: ['admin', 'dashboard'],
    staff: (filters) => ['admin', 'staff', filters],
    staffDetail: (id) => ['admin', 'staff', id],
    roles: ['admin', 'roles'],
    departments: (filters) => ['admin', 'departments', filters],
    departmentDetail: (id) => ['admin', 'departments', id],
    reportsOverview: (filters) => ['admin', 'reports', 'overview', filters],
    reportsVisits: (filters) => ['admin', 'reports', 'visits', filters],
    permissionCatalog: ['admin', 'permission-catalog'],
    bedAllocations: (filters) => ['admin', 'bed-allocations', filters],
    bedAllocationDetail: (id) => ['admin', 'bed-allocations', 'detail', id],
    workforceDashboard: (filters) => ['admin', 'workforce', 'dashboard', filters],
    workforceShifts: (filters) => ['admin', 'workforce', 'shifts', filters],
    workforceRoster: (filters) => ['admin', 'workforce', 'roster', filters],
    profile: ['admin', 'profile'],
    notifications: ['admin', 'notifications'],
    notificationsList: (filters) => ['admin', 'notifications', 'list', filters],
    notificationsUnreadCount: ['admin', 'notifications', 'unread-count'],
    opdSettings: ['admin', 'settings', 'opd'],
  },

  doctor: {

    records: ['doctor', 'records'],

    prescriptions: ['doctor', 'prescriptions'],

    prescriptionDetail: (id) => ['doctor', 'prescriptions', 'detail', id],

    labs: ['doctor', 'labs'],

    labCatalog: (filters = {}) => ['doctor', 'lab-catalog', filters],

    labReport: (testId) => ['doctor', 'labs', 'report', testId],

    notifications: ['doctor', 'notifications'],

    // Doctor Phase 2 by Atharva — cache keys for profile + paginated inbox / unread badge
    profile: ['doctor', 'profile'],
    notificationsList: (filters) => ['doctor', 'notifications', 'list', filters],
    notificationsUnreadCount: ['doctor', 'notifications', 'unread-count'],

    appointments: {

      all: ['doctor', 'appointments'],

      dashboardStats: ['doctor', 'appointments', 'dashboard-stats'],

      today: ['doctor', 'appointments', 'today'],

      byDate: (date) => ['doctor', 'appointments', 'by-date', date],

      history: ['doctor', 'appointments', 'history'],

      detail: (id) => ['doctor', 'appointments', 'detail', id],

    },

    queue: {

      all: ['doctor', 'queue'],

      today: ['doctor', 'queue', 'today'],

      current: ['doctor', 'queue', 'current'],

    },

    consultations: {

      context: (appointmentId) => ['doctor', 'consultations', 'context', appointmentId],

    },

    patients: {

      visits: ['doctor', 'patients', 'visits'],
      patientVisits: (params) => ['doctor', 'patients', 'patient-visits', params],

      history: (uhid, params) => ['doctor', 'patients', 'history', uhid, params],

      prescriptions: (patientId) => ['doctor', 'patients', 'prescriptions', patientId],

      vitals: (patientId, filters) => ['doctor', 'patients', 'vitals', patientId, filters],

      notes: (patientId, filters) => ['doctor', 'patients', 'notes', patientId, filters],

    },

    ipd: {
      admissions: (filters) => ['doctor', 'ipd', 'admissions', filters],
    },

  },

  lab: {
    all: ['lab'],
    dashboard: ['lab', 'dashboard'],
    orders: (filters) => ['lab', 'orders', filters],
    order: (id) => ['lab', 'order', id],
    reports: (filters) => ['lab', 'reports', filters],
    report: (id) => ['lab', 'report', id],
    profile: ['lab', 'profile'],
    notifications: ['lab', 'notifications'],
    notificationsList: (filters) => ['lab', 'notifications', 'list', filters],
    notificationsUnreadCount: ['lab', 'notifications', 'unread-count'],
  },

  receptionist: {
    all: ['receptionist'],
    profile: ['receptionist', 'profile'],
    notifications: ['receptionist', 'notifications'],
    notificationsList: (filters) => ['receptionist', 'notifications', 'list', filters],
    notificationsUnreadCount: ['receptionist', 'notifications', 'unread-count'],
  },

  ipd: {
    all: ['ipd'],
    dashboard: ['ipd', 'dashboard'],
    patients: (filters) => ['ipd', 'patients', filters],
    admission: (id) => ['ipd', 'admission', id],
    beds: (filters) => ['ipd', 'beds', filters],
    wards: ['ipd', 'beds', 'wards'],
    runningBills: (filters) => ['ipd', 'billing', 'running', filters],
    billPreview: (admissionId) => ['ipd', 'billing', 'preview', admissionId],
    billingAdmission: (admissionId) => ['ipd', 'billing', 'admission', admissionId],
    dailyBilling: (admissionId) => ['ipd', 'billing', 'daily', admissionId],
    finalBilling: (admissionId) => ['ipd', 'billing', 'final', admissionId],
    insuranceBillingBundle: (patientId) => [
      'ipd',
      'billing',
      'insurance',
      patientId,
    ],
    billInvoice: (billId) => ['ipd', 'billing', 'invoice', billId],
    paymentHistory: (filters) => ['ipd', 'payments', 'history', filters],
    profile: ['ipd', 'profile'],
    departments: ['ipd', 'reference', 'departments'],
    doctors: (departmentId) => ['ipd', 'reference', 'doctors', departmentId],
  },

  superAdmin: {
    profile: ['super-admin', 'profile'],
  },

};


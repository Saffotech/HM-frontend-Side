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

    wards: ['beds', 'wards'],

    ward: (name) => ['beds', 'ward', name],

  },

  opd: {

    departments: ['opd', 'departments'],

    doctors: (departmentId) => ['opd', 'doctors', departmentId],

    dashboard: ['opd', 'dashboard'],

  },

  pharmacy: {
    all: ['pharmacy'],
    dashboard: ['pharmacy', 'dashboard'],
    prescriptions: (filters) => ['pharmacy', 'prescriptions', filters],
    prescription: (id) => ['pharmacy', 'prescription', id],
    history: (params) => ['pharmacy', 'history', params],
    prescriptionHistory: (id) => ['pharmacy', 'prescription-history', id],
  },

  nurse: {
    all: ['nurse'],
    queue: (filters) => ['nurse', 'queue', filters],
    bedPatients: (filters) => ['nurse', 'bed-patients', filters],
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
    alertSummary: ['nurse', 'alert-summary'],
    alert: (id) => ['nurse', 'alert', id],
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
  },

  doctor: {

    records: ['doctor', 'records'],

    prescriptions: ['doctor', 'prescriptions'],

    prescriptionDetail: (id) => ['doctor', 'prescriptions', 'detail', id],

    labs: ['doctor', 'labs'],

    labReport: (testId) => ['doctor', 'labs', 'report', testId],

    notifications: ['doctor', 'notifications'],

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

      history: (uhid) => ['doctor', 'patients', 'history', uhid],

      prescriptions: (patientId) => ['doctor', 'patients', 'prescriptions', patientId],

    },

  },

  lab: {
    all: ['lab'],
    dashboard: ['lab', 'dashboard'],
    orders: (filters) => ['lab', 'orders', filters],
    order: (id) => ['lab', 'order', id],
    reports: (filters) => ['lab', 'reports', filters],
    report: (id) => ['lab', 'report', id],
  },

};


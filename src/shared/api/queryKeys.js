/** TanStack Query key factory — shared across OPD and doctor features */

import { getHospitalStorageScope } from '../../components/security/hospitalStorageScope.js';

/** Identity segment for hospital-specific caches. Prefix `all` keys stay unscoped so existing invalidation still matches. */
export function hospitalQueryScope() {
  const scope = getHospitalStorageScope();
  return {
    tenantId: scope?.tenantId ?? null,
    userId: scope?.userId ?? null,
  };
}

function scoped(key) {
  return [...key, hospitalQueryScope()];
}

export const queryKeys = {
  patients: {
    all: ['patients'],
    list: (filters) => scoped(['patients', 'list', filters]),
    detail: (id) => scoped(['patients', id]),
    profile: (dbId) => scoped(['patients', 'profile', dbId]),
    searchPhone: (phone) => scoped(['patients', 'search-phone', phone]),
  },

  appointments: {
    all: ['appointments'],
    list: (filters) => scoped(['appointments', 'list', filters]),
    get today() { return scoped(['appointments', 'today']); },
    doctorSlots: (doctorId, deptId, date) => scoped(['appointments', 'slots', doctorId, deptId, date]),
    detail: (id) => scoped(['appointments', id]),
  },

  bills: {
    all: ['bills'],
    list: (filters) => scoped(['bills', 'list', filters]),
    detail: (id) => scoped(['bills', id]),
    invoice: (visitId) => scoped(['bills', 'invoice', visitId]),
    get payments() { return scoped(['bills', 'payments']); },
    paymentHistory: (filters) => scoped(['bills', 'payment-history', filters]),
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
    prescriptions: (filters) => scoped(['pharmacy', 'prescriptions', filters]),
    prescription: (id) => scoped(['pharmacy', 'prescription', id]),
    history: (params) => scoped(['pharmacy', 'history', params]),
    prescriptionHistory: (id) => scoped(['pharmacy', 'prescription-history', id]),
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
    handovers: (filters) => scoped(['nurse', 'handovers', filters]),
    handover: (id) => scoped(['nurse', 'handover', id]),
    alerts: (filters) => ['nurse', 'alerts', filters],
    alertSummary: (filters = {}) => ['nurse', 'alert-summary', filters],
    alert: (id) => ['nurse', 'alert', id],
    doctorVisits: (filters) => ['nurse', 'doctor-visits', filters],
    doctorVisitsDoctors: (filters = {}) => ['nurse', 'doctor-visits', 'doctors', filters],
    doctorVisitsDepartments: (filters = {}) => ['nurse', 'doctor-visits', 'departments', filters],
    labReports: (filters) => scoped(['nurse', 'lab-reports', filters]),
    labReport: (id, filters = {}) => scoped(['nurse', 'lab-reports', 'detail', id, filters]),
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
    bedAllocations: (filters) => scoped(['admin', 'bed-allocations', filters]),
    bedAllocationDetail: (id) => scoped(['admin', 'bed-allocations', 'detail', id]),
    workforceDashboard: (filters) => scoped(['admin', 'workforce', 'dashboard', filters]),
    workforceShifts: (filters) => scoped(['admin', 'workforce', 'shifts', filters]),
    workforceRoster: (filters) => scoped(['admin', 'workforce', 'roster', filters]),
    profile: ['admin', 'profile'],
    notifications: ['admin', 'notifications'],
    notificationsList: (filters) => ['admin', 'notifications', 'list', filters],
    notificationsUnreadCount: ['admin', 'notifications', 'unread-count'],
    opdSettings: ['admin', 'settings', 'opd'],
    labCatalog: (filters = {}) => scoped(['admin', 'lab-catalog', filters]),
  },

  doctor: {
    records: ['doctor', 'records'],
    prescriptions: ['doctor', 'prescriptions'],
    prescriptionDetail: (id) => ['doctor', 'prescriptions', 'detail', id],
    get labs() { return scoped(['doctor', 'labs']); },
    labCatalog: (filters = {}) => scoped(['doctor', 'lab-catalog', filters]),
    labReport: (testId) => scoped(['doctor', 'labs', 'report', testId]),
    notifications: ['doctor', 'notifications'],
    profile: ['doctor', 'profile'],
    notificationsList: (filters) => ['doctor', 'notifications', 'list', filters],
    notificationsUnreadCount: ['doctor', 'notifications', 'unread-count'],

    appointments: {
      all: ['doctor', 'appointments'],
      get dashboardStats() { return scoped(['doctor', 'appointments', 'dashboard-stats']); },
      get today() { return scoped(['doctor', 'appointments', 'today']); },
      byDate: (date) => scoped(['doctor', 'appointments', 'by-date', date]),
      get history() { return scoped(['doctor', 'appointments', 'history']); },
      detail: (id) => scoped(['doctor', 'appointments', 'detail', id]),
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
      get visits() { return scoped(['doctor', 'patients', 'visits']); },
      patientVisits: (params) => scoped(['doctor', 'patients', 'patient-visits', params]),
      history: (uhid, params) => scoped(['doctor', 'patients', 'history', uhid, params]),
      prescriptions: (patientId) => scoped(['doctor', 'patients', 'prescriptions', patientId]),
      vitals: (patientId, filters) => scoped(['doctor', 'patients', 'vitals', patientId, filters]),
      notes: (patientId, filters) => scoped(['doctor', 'patients', 'notes', patientId, filters]),
    },

    ipd: {
      admissions: (filters) => scoped(['doctor', 'ipd', 'admissions', filters]),
    },
  },

  lab: {
    all: ['lab'],
    get dashboard() { return scoped(['lab', 'dashboard']); },
    orders: (filters) => scoped(['lab', 'orders', filters]),
    order: (id) => scoped(['lab', 'order', id]),
    reports: (filters) => scoped(['lab', 'reports', filters]),
    report: (id) => scoped(['lab', 'report', id]),
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
    patients: (filters) => scoped(['ipd', 'patients', filters]),
    admission: (id) => scoped(['ipd', 'admission', id == null ? id : String(id)]),
    beds: (filters) => ['ipd', 'beds', filters],
    wards: ['ipd', 'beds', 'wards'],
    runningBills: (filters) => scoped(['ipd', 'billing', 'running', filters]),
    billPreview: (admissionId) => scoped(['ipd', 'billing', 'preview', admissionId]),
    billingAdmission: (admissionId) => scoped(['ipd', 'billing', 'admission', admissionId]),
    dailyBilling: (admissionId) => scoped(['ipd', 'billing', 'daily', admissionId]),
    finalBilling: (admissionId) => scoped(['ipd', 'billing', 'final', admissionId]),
    insuranceBillingBundle: (patientId) => scoped(['ipd', 'billing', 'insurance', patientId]),
    billInvoice: (billId) => scoped(['ipd', 'billing', 'invoice', billId]),
    paymentHistory: (filters) => scoped(['ipd', 'payments', 'history', filters]),
    profile: ['ipd', 'profile'],
    departments: ['ipd', 'reference', 'departments'],
    doctors: (departmentId) => ['ipd', 'reference', 'doctors', departmentId],
  },

  superAdmin: {
    profile: ['super-admin', 'profile'],
  },
};

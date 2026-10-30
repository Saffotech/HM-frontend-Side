/**
 * Maps a notification onto a screen inside the recipient's current module.
 * source_module is ignored on purpose: the event may originate elsewhere.
 */

import {
  NOTIFICATION_MODULE,
  isDestinationInModule,
} from './notificationModules.js';

/** Keep these path strings aligned with shared/constants ROUTES. */
const PATHS = {
  NURSE_DASHBOARD: '/nurse/dashboard',
  NURSE_MY_DUTY: '/nurse/my-duty',
  NURSE_PATIENT: '/nurse/patients/:patientId',
  NURSE_DOCTOR_VISITS_PATIENT: '/nurse/doctor-visits/patient/:patientId',
  NURSE_HANDOVER_DETAIL: '/nurse/handover/:id',
  NURSE_PROFILE: '/nurse/profile',
  DOCTOR_DASHBOARD: '/doctor/dashboard',
  DOCTOR_PROFILE: '/doctor/profile',
  PHARMACY_PRESCRIPTION_DETAIL: '/pharmacy/prescriptions/:id',
  PHARMACY_PROFILE: '/pharmacy/profile',
  LAB_ORDER_UPLOAD: '/lab/orders/:id/upload',
  LAB_PROFILE: '/lab/profile',
  OPD_PROFILE: '/opd/profile',
  BILLING: '/billing',
  BILLING_VIEW: '/billing/:id',
  APPOINTMENTS: '/appointments',
  PATIENT_PROFILE: '/patients/:id/profile',
  RECEPTIONIST_DASHBOARD: '/receptionist/dashboard',
  RECEPTIONIST_PROFILE: '/receptionist/profile',
  MANAGER_STAFF_DETAIL: '/manager/staff/:id',
  MANAGER_PROFILE: '/manager/profile',
  MANAGER_NURSE_WORKFORCE_ROSTER: '/manager/nurse-workforce/roster',
  MANAGER_REPORTS_VISITS: '/manager/reports/visits',
};

export function positiveReferenceId(value) {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) return null;
  return id;
}

export function parseLabeledLine(message, label) {
  const match = String(message || '').match(new RegExp(`^${label}:\\s*(.+)$`, 'im'));
  return match ? match[1].trim() : '';
}

/** Patient line from IPD notifications: `Patient: Name (UID)`. */
export function parsePatientUid(message) {
  const line = parseLabeledLine(message, 'Patient');
  const match = line.match(/\(([^()\s]+)\)\s*$/);
  return match ? match[1] : '';
}

/** `Ward: {ward}  Bed: {bed}` */
export function parseWardAndBed(message) {
  const line = parseLabeledLine(message, 'Ward');
  const match = line.match(/^(.*?)\s+Bed:\s*(.+)$/i);
  if (!match) return { ward: '', bed: '' };
  const ward = match[1].trim();
  const bed = match[2].trim();
  return {
    ward: ward && ward !== '—' ? ward : '',
    bed: bed && bed !== '—' ? bed : '',
  };
}

export function parseAppointmentUid(message) {
  const uid = parseLabeledLine(message, 'Appointment');
  if (!uid || uid === '—') return '';
  return uid.split(/\s+/)[0];
}

function stay(message) {
  return { status: 'stay', pathname: '', search: '', state: null, message, resolveKind: null };
}

function go(module, pathname, { search = '', state = null, message = '', resolveKind = null } = {}) {
  if (!isDestinationInModule(module, pathname)) {
    return stay('This notification cannot be opened in your current module.');
  }
  return {
    status: resolveKind ? 'resolve' : 'navigate',
    pathname,
    search,
    state,
    message,
    resolveKind,
  };
}

function searchOf(params) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value != null && value !== '') query.set(key, String(value));
  }
  const text = query.toString();
  return text ? `?${text}` : '';
}

function fill(route, params) {
  return Object.entries(params).reduce(
    (path, [key, value]) => path.replace(`:${key}`, encodeURIComponent(String(value))),
    route,
  );
}

function referenceType(notification) {
  return String(notification?.reference_type || '').toUpperCase();
}

function notificationType(notification) {
  return String(notification?.notification_type || '').toUpperCase();
}

function resolveNurse(notification) {
  const type = notificationType(notification);
  const ref = referenceType(notification);
  const id = positiveReferenceId(notification?.reference_id);

  if (type === 'IPD_ADMITTED' || ref === 'ADMISSION') {
    if (!id) {
      return stay('This admission notification has no admission id, so no patient was opened.');
    }
    return go(NOTIFICATION_MODULE.NURSE, PATHS.NURSE_DASHBOARD, {
      resolveKind: 'nurse-admission',
      message: 'This admission could not be matched to a single patient on your nurse list.',
    });
  }

  if (type === 'SHIFT_UPDATED' || ref === 'SCHEDULE') {
    return go(NOTIFICATION_MODULE.NURSE, PATHS.NURSE_MY_DUTY);
  }

  if (
    type === 'NURSE_DOCTOR_VISIT_CREATED'
    || type === 'NURSE_DOCTOR_VISIT_UPDATED'
    || type === 'NURSE_DOCTOR_VISIT_VOIDED'
    || ref === 'PATIENT'
  ) {
    if (!id || (ref && ref !== 'PATIENT')) {
      return stay('This visit notification does not include a patient id, so no visit was opened.');
    }
    return go(
      NOTIFICATION_MODULE.NURSE,
      fill(PATHS.NURSE_DOCTOR_VISITS_PATIENT, { patientId: id }),
    );
  }

  if (ref === 'HANDOVER' && id) {
    return go(NOTIFICATION_MODULE.NURSE, fill(PATHS.NURSE_HANDOVER_DETAIL, { id }));
  }

  if (ref === 'USER' || type === 'ADMIN_UPDATE') {
    return go(NOTIFICATION_MODULE.NURSE, PATHS.NURSE_PROFILE);
  }

  return stay('This notification has no related screen in the Nurse module.');
}

function resolveDoctor(notification) {
  const type = notificationType(notification);
  const ref = referenceType(notification);
  const id = positiveReferenceId(notification?.reference_id);

  if (
    type === 'NEW_APPOINTMENT'
    || type === 'APPOINTMENT_CANCELLED'
    || type === 'APPOINTMENT_RESCHEDULED'
    || ref === 'APPOINTMENT'
  ) {
    if (!id || (ref && ref !== 'APPOINTMENT')) {
      return stay('This appointment notification has no appointment id.');
    }
    return go(NOTIFICATION_MODULE.DOCTOR, PATHS.DOCTOR_DASHBOARD, {
      search: searchOf({ appointment: id }),
    });
  }

  if (type === 'LAB_REPORT_READY' || type === 'LAB_REPORT_UPDATED' || ref === 'LAB_ORDER') {
    if (!id || (ref && ref !== 'LAB_ORDER')) {
      return stay('This lab notification has no lab order id.');
    }
    return go(NOTIFICATION_MODULE.DOCTOR, PATHS.DOCTOR_DASHBOARD, {
      search: searchOf({ section: 'labs', labOrder: id }),
    });
  }

  if (type === 'IPD_ADMITTED' || ref === 'ADMISSION') {
    if (!id || (ref && ref !== 'ADMISSION')) {
      return stay('This admission notification has no admission id.');
    }
    return go(NOTIFICATION_MODULE.DOCTOR, PATHS.DOCTOR_DASHBOARD, {
      search: searchOf({ mode: 'ipd', admission: id }),
    });
  }

  if (
    type === 'NURSE_DOCTOR_VISIT_CREATED'
    || type === 'NURSE_DOCTOR_VISIT_UPDATED'
    || type === 'NURSE_DOCTOR_VISIT_VOIDED'
    || ref === 'PATIENT'
  ) {
    if (!id || (ref && ref !== 'PATIENT')) {
      return stay('This visit notification does not include a patient id.');
    }
    return go(NOTIFICATION_MODULE.DOCTOR, PATHS.DOCTOR_DASHBOARD, {
      search: searchOf({ section: 'patients', mode: 'ipd', patient: id }),
    });
  }

  if (type === 'SHIFT_UPDATED' || ref === 'SCHEDULE') {
    return go(NOTIFICATION_MODULE.DOCTOR, PATHS.DOCTOR_DASHBOARD, {
      search: searchOf({ section: 'schedule' }),
    });
  }

  if (ref === 'USER' || type === 'ADMIN_UPDATE') {
    return go(NOTIFICATION_MODULE.DOCTOR, PATHS.DOCTOR_PROFILE);
  }

  return stay('This notification has no related screen in the Doctor module.');
}

function resolvePharmacy(notification) {
  const type = notificationType(notification);
  const ref = referenceType(notification);
  const id = positiveReferenceId(notification?.reference_id);

  if (
    type === 'PRESCRIPTION_CREATED'
    || type === 'PRESCRIPTION_UPDATED'
    || ref === 'PRESCRIPTION'
  ) {
    if (!id || (ref && ref !== 'PRESCRIPTION')) {
      return stay('This prescription notification has no prescription id.');
    }
    return go(
      NOTIFICATION_MODULE.PHARMACY,
      fill(PATHS.PHARMACY_PRESCRIPTION_DETAIL, { id }),
    );
  }

  if (ref === 'SCHEDULE') {
    return go(NOTIFICATION_MODULE.PHARMACY, PATHS.PHARMACY_PROFILE, {
      state: { pharmacistProfileTab: 'account' },
    });
  }

  if (ref === 'USER' || type === 'ADMIN_UPDATE') {
    return go(NOTIFICATION_MODULE.PHARMACY, PATHS.PHARMACY_PROFILE);
  }

  return stay('This notification has no related screen in the Pharmacy module.');
}

function resolveLab(notification) {
  const type = notificationType(notification);
  const ref = referenceType(notification);
  const id = positiveReferenceId(notification?.reference_id);

  if (ref === 'ALERT' || (type === 'ADMIN_UPDATE' && ref !== 'LAB_ORDER' && ref !== 'USER' && ref !== 'SCHEDULE')) {
    return stay(
      'This alert is not a lab order. Laboratory has no catalog record screen, so the price update was not opened as an order.',
    );
  }

  if (
    type === 'LAB_ORDER_CREATED'
    || type === 'LAB_ORDER_CANCELLED'
    || ref === 'LAB_ORDER'
  ) {
    if (!id) {
      return stay('This lab notification has no order id.');
    }
    return go(NOTIFICATION_MODULE.LAB, fill(PATHS.LAB_ORDER_UPLOAD, { id }));
  }

  if (ref === 'SCHEDULE') {
    return go(NOTIFICATION_MODULE.LAB, PATHS.LAB_PROFILE, {
      state: { labProfileTab: 'account' },
    });
  }

  if (ref === 'USER') {
    return go(NOTIFICATION_MODULE.LAB, PATHS.LAB_PROFILE);
  }

  return stay('This notification has no related screen in the Laboratory module.');
}

function resolveOpd(notification) {
  const type = notificationType(notification);
  const ref = referenceType(notification);
  const id = positiveReferenceId(notification?.reference_id);

  if (
    type === 'PAYMENT_PENDING'
    || type === 'QUEUE_ENQUEUE_FAILED'
    || ref === 'BILL'
  ) {
    if (!id || (ref && ref !== 'BILL')) {
      return stay('This billing notification has no visit id.');
    }
    return go(NOTIFICATION_MODULE.OPD, PATHS.BILLING, {
      resolveKind: 'opd-visit-bill',
      message: 'This visit could not be opened as a bill.',
    });
  }

  if (type === 'APPOINTMENT_NO_SHOW' || ref === 'APPOINTMENT') {
    const uid = parseAppointmentUid(notification?.message);
    if (!uid) {
      return stay(
        'This appointment notification only has a numeric id. The appointments list can filter by appointment number, which is not in this notification.',
      );
    }
    return go(NOTIFICATION_MODULE.OPD, PATHS.APPOINTMENTS, {
      search: searchOf({ q: uid }),
    });
  }

  if (ref === 'PATIENT' && id) {
    return go(NOTIFICATION_MODULE.OPD, fill(PATHS.PATIENT_PROFILE, { id }));
  }

  if (ref === 'SCHEDULE') {
    return go(NOTIFICATION_MODULE.OPD, PATHS.OPD_PROFILE, {
      state: { opdProfileTab: 'account' },
    });
  }

  if (ref === 'USER' || type === 'ADMIN_UPDATE') {
    return go(NOTIFICATION_MODULE.OPD, PATHS.OPD_PROFILE);
  }

  return stay('This notification has no related screen in OPD Billing.');
}

function resolveReceptionist(notification) {
  const type = notificationType(notification);
  const ref = referenceType(notification);
  const id = positiveReferenceId(notification?.reference_id);

  if (ref === 'PATIENT' || ref === 'APPOINTMENT') {
    if (!id) {
      return stay('This notification has no patient or appointment id.');
    }
    return go(NOTIFICATION_MODULE.RECEPTIONIST, PATHS.RECEPTIONIST_DASHBOARD, {
      search: searchOf({ q: id }),
    });
  }

  if (type === 'SHIFT_UPDATED' || ref === 'SCHEDULE') {
    return go(NOTIFICATION_MODULE.RECEPTIONIST, PATHS.RECEPTIONIST_PROFILE, {
      state: { receptionistProfileTab: 'account' },
    });
  }

  if (ref === 'USER' || type === 'ADMIN_UPDATE') {
    return go(NOTIFICATION_MODULE.RECEPTIONIST, PATHS.RECEPTIONIST_PROFILE);
  }

  return stay('This notification has no related screen in Reception.');
}

function resolveManager(notification) {
  const ref = referenceType(notification);
  const type = notificationType(notification);
  const id = positiveReferenceId(notification?.reference_id);

  if (ref === 'USER' && id) {
    return go(NOTIFICATION_MODULE.MANAGER, fill(PATHS.MANAGER_STAFF_DETAIL, { id }));
  }

  if (ref === 'USER' || (type === 'ADMIN_UPDATE' && !ref)) {
    return go(NOTIFICATION_MODULE.MANAGER, PATHS.MANAGER_PROFILE);
  }

  if (type === 'SHIFT_UPDATED' || ref === 'SCHEDULE') {
    return go(NOTIFICATION_MODULE.MANAGER, PATHS.MANAGER_NURSE_WORKFORCE_ROSTER);
  }

  if (ref === 'BILL' || type === 'QUEUE_ENQUEUE_FAILED' || type === 'PAYMENT_PENDING') {
    if (!id) {
      return stay('This billing notification has no visit id.');
    }
    return go(NOTIFICATION_MODULE.MANAGER, PATHS.MANAGER_REPORTS_VISITS, {
      search: searchOf({ visit: id }),
    });
  }

  if (ref === 'ALERT') {
    return stay('This alert has no operational record screen in the Manager module.');
  }

  if (ref === 'PATIENT') {
    return stay('The Manager module has no patient record screen for this notification.');
  }

  if (type === 'ADMIN_UPDATE') {
    return go(NOTIFICATION_MODULE.MANAGER, PATHS.MANAGER_PROFILE);
  }

  return stay('This notification has no related screen in the Manager module.');
}

const RESOLVERS = {
  [NOTIFICATION_MODULE.NURSE]: resolveNurse,
  [NOTIFICATION_MODULE.DOCTOR]: resolveDoctor,
  [NOTIFICATION_MODULE.PHARMACY]: resolvePharmacy,
  [NOTIFICATION_MODULE.LAB]: resolveLab,
  [NOTIFICATION_MODULE.OPD]: resolveOpd,
  [NOTIFICATION_MODULE.RECEPTIONIST]: resolveReceptionist,
  [NOTIFICATION_MODULE.MANAGER]: resolveManager,
};

export function resolveNotificationDestination(notification, module) {
  const resolver = RESOLVERS[module];
  if (!resolver) {
    return stay('Notifications cannot be opened from this module.');
  }
  const destination = resolver(notification);
  if (destination.pathname && !isDestinationInModule(module, destination.pathname)) {
    return stay('This notification cannot be opened in your current module.');
  }
  return destination;
}

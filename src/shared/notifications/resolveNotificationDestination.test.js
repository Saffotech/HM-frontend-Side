import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { NOTIFICATION_MODULE, isDestinationInModule } from './notificationModules.js';
import {
  parseAppointmentUid,
  parsePatientUid,
  parseWardAndBed,
  resolveNotificationDestination,
} from './resolveNotificationDestination.js';

function note(module, fields) {
  return resolveNotificationDestination(fields, module);
}

describe('notification destination resolver', () => {
  it('keeps nurse admissions inside the nurse module', () => {
    const destination = note(NOTIFICATION_MODULE.NURSE, {
      notification_type: 'IPD_ADMITTED',
      reference_type: 'ADMISSION',
      reference_id: 44,
      source_module: 'IPD',
    });
    assert.equal(destination.status, 'resolve');
    assert.equal(destination.resolveKind, 'nurse-admission');
    assert.equal(isDestinationInModule(NOTIFICATION_MODULE.NURSE, destination.pathname), true);
    assert.equal(destination.pathname.includes('/ipd'), false);
  });

  it('opens nurse schedule for shift and bed-allocation updates', () => {
    const destination = note(NOTIFICATION_MODULE.NURSE, {
      notification_type: 'SHIFT_UPDATED',
      reference_type: 'SCHEDULE',
      reference_id: 9,
      source_module: 'ADMIN',
    });
    assert.equal(destination.pathname, '/nurse/my-duty');
  });

  it('opens the nurse visit history for a patient id', () => {
    const destination = note(NOTIFICATION_MODULE.NURSE, {
      notification_type: 'NURSE_DOCTOR_VISIT_UPDATED',
      reference_type: 'PATIENT',
      reference_id: 15,
      source_module: 'NURSE',
    });
    assert.equal(destination.pathname, '/nurse/doctor-visits/patient/15');
  });

  it('opens doctor appointments, lab reports, admissions, and visits in the doctor module', () => {
    const appointment = note(NOTIFICATION_MODULE.DOCTOR, {
      notification_type: 'APPOINTMENT_RESCHEDULED',
      reference_type: 'APPOINTMENT',
      reference_id: 8,
      source_module: 'OPD_BILLING',
    });
    assert.equal(appointment.pathname, '/doctor/dashboard');
    assert.match(appointment.search, /appointment=8/);
    assert.equal(appointment.pathname.includes('/appointments'), false);

    const lab = note(NOTIFICATION_MODULE.DOCTOR, {
      notification_type: 'LAB_REPORT_READY',
      reference_type: 'LAB_ORDER',
      reference_id: 3,
      source_module: 'LAB',
    });
    assert.match(lab.search, /section=labs/);
    assert.match(lab.search, /labOrder=3/);
    assert.equal(lab.pathname.startsWith('/lab'), false);

    const admission = note(NOTIFICATION_MODULE.DOCTOR, {
      notification_type: 'IPD_ADMITTED',
      reference_type: 'ADMISSION',
      reference_id: 12,
      source_module: 'IPD',
    });
    assert.match(admission.search, /mode=ipd/);
    assert.match(admission.search, /admission=12/);

    const visit = note(NOTIFICATION_MODULE.DOCTOR, {
      notification_type: 'NURSE_DOCTOR_VISIT_CREATED',
      reference_type: 'PATIENT',
      reference_id: 20,
    });
    assert.match(visit.search, /patient=20/);
    assert.match(visit.search, /mode=ipd/);
  });

  it('opens the pharmacy prescription detail', () => {
    const destination = note(NOTIFICATION_MODULE.PHARMACY, {
      notification_type: 'PRESCRIPTION_CREATED',
      reference_type: 'PRESCRIPTION',
      reference_id: 77,
      source_module: 'DOCTOR',
    });
    assert.equal(destination.pathname, '/pharmacy/prescriptions/77');
  });

  it('opens lab orders and refuses catalog alerts', () => {
    const created = note(NOTIFICATION_MODULE.LAB, {
      notification_type: 'LAB_ORDER_CREATED',
      reference_type: 'LAB_ORDER',
      reference_id: 5,
    });
    assert.equal(created.pathname, '/lab/orders/5/upload');

    const cancelled = note(NOTIFICATION_MODULE.LAB, {
      notification_type: 'LAB_ORDER_CANCELLED',
      reference_type: 'LAB_ORDER',
      reference_id: 6,
    });
    assert.equal(cancelled.pathname, '/lab/orders/6/upload');

    const alert = note(NOTIFICATION_MODULE.LAB, {
      notification_type: 'ADMIN_UPDATE',
      reference_type: 'ALERT',
      reference_id: 99,
      source_module: 'ADMIN',
    });
    assert.equal(alert.status, 'stay');
    assert.match(alert.message, /not a lab order/i);
  });

  it('resolves OPD bills from the visit id and filters no-show appointments by uid', () => {
    const pending = note(NOTIFICATION_MODULE.OPD, {
      notification_type: 'PAYMENT_PENDING',
      reference_type: 'BILL',
      reference_id: 41,
    });
    assert.equal(pending.resolveKind, 'opd-visit-bill');

    const failed = note(NOTIFICATION_MODULE.OPD, {
      notification_type: 'QUEUE_ENQUEUE_FAILED',
      reference_type: 'BILL',
      reference_id: 42,
    });
    assert.equal(failed.resolveKind, 'opd-visit-bill');

    const noShow = note(NOTIFICATION_MODULE.OPD, {
      notification_type: 'APPOINTMENT_NO_SHOW',
      reference_type: 'APPOINTMENT',
      reference_id: 9,
      message: 'Appointment: APT-1001\nScheduled: 10:00 AM',
    });
    assert.equal(noShow.pathname, '/appointments');
    assert.match(noShow.search, /q=APT-1001/);

    const missingUid = note(NOTIFICATION_MODULE.OPD, {
      notification_type: 'APPOINTMENT_NO_SHOW',
      reference_type: 'APPOINTMENT',
      reference_id: 9,
      message: 'Patient did not attend.',
    });
    assert.equal(missingUid.status, 'stay');
  });

  it('filters receptionist records by the reference id', () => {
    const patient = note(NOTIFICATION_MODULE.RECEPTIONIST, {
      reference_type: 'PATIENT',
      reference_id: 18,
    });
    assert.equal(patient.pathname, '/receptionist/dashboard');
    assert.match(patient.search, /q=18/);

    const appointment = note(NOTIFICATION_MODULE.RECEPTIONIST, {
      reference_type: 'APPOINTMENT',
      reference_id: 30,
    });
    assert.match(appointment.search, /q=30/);
  });

  it('opens manager staff and visit context without leaving the manager module', () => {
    const staff = note(NOTIFICATION_MODULE.MANAGER, {
      reference_type: 'USER',
      reference_id: 4,
    });
    assert.equal(staff.pathname, '/manager/staff/4');

    const schedule = note(NOTIFICATION_MODULE.MANAGER, {
      notification_type: 'SHIFT_UPDATED',
      reference_type: 'SCHEDULE',
      reference_id: 2,
    });
    assert.equal(schedule.pathname, '/manager/nurse-workforce/roster');

    const bill = note(NOTIFICATION_MODULE.MANAGER, {
      notification_type: 'QUEUE_ENQUEUE_FAILED',
      reference_type: 'BILL',
      reference_id: 55,
      source_module: 'OPD_BILLING',
    });
    assert.equal(bill.pathname, '/manager/reports/visits');
    assert.match(bill.search, /visit=55/);

    const alert = note(NOTIFICATION_MODULE.MANAGER, {
      reference_type: 'ALERT',
      reference_id: 1,
    });
    assert.equal(alert.status, 'stay');

    const patient = note(NOTIFICATION_MODULE.MANAGER, {
      reference_type: 'PATIENT',
      reference_id: 7,
    });
    assert.equal(patient.status, 'stay');
  });

  it('does not follow source_module into another module', () => {
    const destination = note(NOTIFICATION_MODULE.PHARMACY, {
      notification_type: 'PRESCRIPTION_CREATED',
      reference_type: 'PRESCRIPTION',
      reference_id: 3,
      source_module: 'DOCTOR',
    });
    assert.equal(isDestinationInModule(NOTIFICATION_MODULE.DOCTOR, destination.pathname), false);
    assert.equal(isDestinationInModule(NOTIFICATION_MODULE.PHARMACY, destination.pathname), true);
  });

  it('uses the same paths as the application route table', () => {
    const routes = readFileSync(new URL('../constants/index.js', import.meta.url), 'utf8');
    const expected = [
      "NURSE_MY_DUTY: '/nurse/my-duty'",
      "NURSE_DOCTOR_VISITS_PATIENT: '/nurse/doctor-visits/patient/:patientId'",
      "DOCTOR_DASHBOARD: '/doctor/dashboard'",
      "PHARMACY_PRESCRIPTION_DETAIL: '/pharmacy/prescriptions/:id'",
      "LAB_ORDER_UPLOAD: '/lab/orders/:id/upload'",
      "BILLING_VIEW: '/billing/:id'",
      "APPOINTMENTS: '/appointments'",
      "RECEPTIONIST_DASHBOARD: '/receptionist/dashboard'",
      "MANAGER_STAFF_DETAIL: '/manager/staff/:id'",
      "MANAGER_NURSE_WORKFORCE_ROSTER: '/manager/nurse-workforce/roster'",
      "MANAGER_REPORTS_VISITS: '/manager/reports/visits'",
    ];
    for (const line of expected) {
      assert.equal(routes.includes(line), true, line);
    }
  });

  it('parses patient and appointment labels from existing messages', () => {
    const message = 'Patient: Ada Lovelace (P-1028)\nWard: General  Bed: 12\nAppointment: APT-9';
    assert.equal(parsePatientUid(message), 'P-1028');
    assert.deepEqual(parseWardAndBed(message), { ward: 'General', bed: '12' });
    assert.equal(parseAppointmentUid(message), 'APT-9');
    assert.equal(parseWardAndBed('Ward: —  Bed: —').bed, '');
  });
});

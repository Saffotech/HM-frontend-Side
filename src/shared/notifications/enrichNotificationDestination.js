import { getBedPatients } from '@/features/nurse/api/nurse';
import { billsApi } from '@/shared/api/services';
import { NOTIFICATION_MODULE } from '@/shared/notifications/notificationModules';
import {
  parsePatientUid,
  parseWardAndBed,
  positiveReferenceId,
} from '@/shared/notifications/resolveNotificationDestination';

function patientPath(patientId) {
  return `/nurse/patients/${encodeURIComponent(String(patientId))}`;
}

function singlePatientId(items, predicate) {
  const matches = (items || []).filter(predicate);
  if (matches.length !== 1) return null;
  const id = positiveReferenceId(matches[0]?.patient_id);
  return id;
}

async function resolveNurseAdmission(notification, token) {
  const uid = parsePatientUid(notification?.message);
  const { ward, bed } = parseWardAndBed(notification?.message);

  if (uid) {
    const data = await getBedPatients(
      { patient_uid: uid, page: 1, page_size: 5 },
      token,
    );
    const id = singlePatientId(
      data?.items,
      (row) => String(row?.patient_uid || '').toLowerCase() === uid.toLowerCase(),
    );
    if (id) {
      return { pathname: patientPath(id) };
    }
  }

  if (bed) {
    const data = await getBedPatients(
      {
        bed_number: bed,
        ward_name: ward || undefined,
        page: 1,
        page_size: 5,
      },
      token,
    );
    const id = singlePatientId(data?.items, () => true);
    if (id) {
      return { pathname: patientPath(id) };
    }
  }

  return null;
}

async function resolveOpdVisitBill(notification, token) {
  const visitId = positiveReferenceId(notification?.reference_id);
  if (!visitId) return null;
  const bill = await billsApi.getBillInvoice(visitId, token);
  const billNumber = bill?.id;
  if (billNumber == null || String(billNumber).trim() === '' || String(billNumber) === '—') {
    return null;
  }
  return {
    pathname: `/billing/${encodeURIComponent(String(billNumber))}`,
  };
}

export async function enrichNotificationDestination(destination, notification, token) {
  if (destination?.status !== 'resolve') return destination;

  try {
    let resolved = null;
    if (destination.resolveKind === 'nurse-admission') {
      resolved = await resolveNurseAdmission(notification, token);
    } else if (destination.resolveKind === 'opd-visit-bill') {
      resolved = await resolveOpdVisitBill(notification, token);
    }

    if (!resolved?.pathname) {
      return {
        ...destination,
        status: 'stay',
        pathname: '',
      };
    }

    const module = destination.resolveKind === 'nurse-admission'
      ? NOTIFICATION_MODULE.NURSE
      : NOTIFICATION_MODULE.OPD;

    return {
      status: 'navigate',
      pathname: resolved.pathname,
      search: '',
      state: null,
      message: '',
      resolveKind: null,
      module,
    };
  } catch {
    return {
      ...destination,
      status: 'stay',
      pathname: '',
      message: destination.message
        || 'The related record could not be loaded, so nothing was opened.',
    };
  }
}

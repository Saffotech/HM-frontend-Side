import {
  getRecords,
  createRecord,
  getNotifications,
} from '@/features/doctor/api/clinical';
import { asList } from '@/shared/api/dataSource';
import {
  apiToUiRecord,
  apiToUiNotification,
  uiRecordToApiCreate,
} from '@/shared/api/mappers/clinicalMapper';
import {
  syncRecords,
  syncNotifications,
} from '@/shared/api/utils/clinicalListSync';

function mapList(mapper, list) {
  return list.map(mapper);
}

async function fetchUiRecords(token) {
  const raw = await getRecords(token);
  return mapList(apiToUiRecord, asList(raw));
}

async function fetchUiNotifications(token) {
  const raw = await getNotifications(token);
  return mapList(apiToUiNotification, asList(raw));
}

async function applyUpdater(token, fetchList, syncFn, updater) {
  const prev = await fetchList(token);
  const next = typeof updater === 'function' ? updater(prev) : updater;
  await syncFn(prev, next, token);
  return next;
}

export async function listRecords(token) {
  return fetchUiRecords(token);
}

export async function addRecord(record, token) {
  const created = await createRecord(uiRecordToApiCreate(record), token);
  return apiToUiRecord(created);
}

export async function mutateRecords(updater, token) {
  return applyUpdater(token, fetchUiRecords, syncRecords, updater);
}

export async function listNotifications(token) {
  return fetchUiNotifications(token);
}

export async function mutateNotifications(updater, token) {
  try {
    return await applyUpdater(token, fetchUiNotifications, syncNotifications, updater);
  } catch {
    const prev = [];
    return typeof updater === 'function' ? updater(prev) : updater;
  }
}

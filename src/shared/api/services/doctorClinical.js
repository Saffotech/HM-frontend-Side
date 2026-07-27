import {
  getRecords,
} from '@/features/doctor/api/clinical';
import { asList } from '@/shared/api/dataSource';
import {
  apiToUiRecord,
} from '@/shared/api/mappers/clinicalMapper';
import {
  syncRecords,
} from '@/shared/api/utils/clinicalListSync';

function mapList(mapper, list) {
  return list.map(mapper);
}

async function fetchUiRecords(token) {
  const raw = await getRecords(token);
  return mapList(apiToUiRecord, asList(raw));
}

async function applyUpdater(token, fetchList, syncFn, updater) {
  const prev = await fetchList(token);
  const next = typeof updater === 'function' ? updater(prev) : updater;
  await syncFn(prev, next, token);
  return next;
}

export async function mutateRecords(updater, token) {
  return applyUpdater(token, fetchUiRecords, syncRecords, updater);
}

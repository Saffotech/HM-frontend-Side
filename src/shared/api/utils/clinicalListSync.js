/**
 * Applies in-memory list updaters to live REST (diff prev → next).
 * Used only by doctorClinical service live branch.
 */

import {
  createRecord,
  patchRecord,
} from '@/features/doctor/api/clinical';
import {
  uiRecordToApiCreate,
  uiRecordToApiPatch,
} from '@/shared/api/mappers/clinicalMapper';

function itemChanged(a, b) {
  return JSON.stringify(a) !== JSON.stringify(b);
}

export async function syncRecords(prev, next, token) {
  const prevIds = new Set(prev.map((r) => r.id));
  for (const item of next) {
    if (!prevIds.has(item.id)) {
      await createRecord(uiRecordToApiCreate(item), token);
      continue;
    }
    const old = prev.find((r) => r.id === item.id);
    if (old && itemChanged(old, item)) {
      await patchRecord(item.id, uiRecordToApiPatch(item), token);
    }
  }
}

/**
 * Admin bed allocation — live backend HTTP + mapping.
 */

import * as allocationApi from '@/features/admin/api/nurseBedAllocation';
import {
  mapAllocationDetailResponse,
  mapAllocationListResponse,
  toBulkCreateAllocationBody,
  toCreateAllocationBody,
  toUpdateAllocationBody,
} from '@/shared/api/mappers/adminBedAllocationMapper';

export async function listBedAllocations(params = {}) {
  const raw = await allocationApi.listNurseBedAllocations(params);
  return mapAllocationListResponse(raw);
}

export async function getBedAllocation(allocationId) {
  const raw = await allocationApi.getNurseBedAllocation(allocationId);
  return mapAllocationDetailResponse(raw);
}

export async function createBedAllocation(form) {
  const raw = await allocationApi.createNurseBedAllocation(toCreateAllocationBody(form));
  return mapAllocationDetailResponse(raw);
}

export async function bulkCreateBedAllocations(form) {
  return allocationApi.bulkCreateNurseBedAllocations(toBulkCreateAllocationBody(form));
}

export async function updateBedAllocation(allocationId, form) {
  const raw = await allocationApi.updateNurseBedAllocation(
    allocationId,
    toUpdateAllocationBody(form),
  );
  return mapAllocationDetailResponse(raw);
}

export async function deactivateBedAllocation(allocationId) {
  const raw = await allocationApi.deactivateNurseBedAllocation(allocationId);
  return mapAllocationDetailResponse(raw);
}

export async function deleteBedAllocation(allocationId) {
  const raw = await allocationApi.deleteNurseBedAllocation(allocationId);
  return mapAllocationDetailResponse(raw);
}

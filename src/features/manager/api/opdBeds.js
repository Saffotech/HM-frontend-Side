/**
 * Admin OPD bed inventory API — Settings → OPD → Beds & wards.
 * Occupancy / transfer / release is IPD-owned (`/ipd/beds*`).
 */

import { apiClient } from '@/shared/api/client';
import { buildQueryString } from '@/shared/utils/buildQueryString';

export async function getBedInventorySummary() {
  return apiClient('/opd/beds/inventory-summary');
}

export async function listInventoryBeds(params = {}) {
  const query = buildQueryString({
    ward: params.ward,
    status: params.status,
    search: params.search,
  });
  return apiClient(`/opd/beds${query}`);
}

export async function createInventoryBed(body) {
  return apiClient('/opd/beds', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function createInventoryBedsBulk(body) {
  return apiClient('/opd/beds/bulk', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function updateInventoryBed(bedId, body) {
  return apiClient(`/opd/beds/${bedId}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

export async function deleteInventoryBed(bedId) {
  return apiClient(`/opd/beds/${bedId}`, {
    method: 'DELETE',
  });
}

export async function deleteInventoryWard(wardName) {
  return apiClient(`/opd/beds/by-ward/${encodeURIComponent(wardName)}`, {
    method: 'DELETE',
  });
}

import { apiClient } from '@/shared/api/client';

export async function requestBackup(token) {
  return apiClient('/admin/backup/request', {
    method: 'POST',
    token,
  });
}

export async function getBackupStatus(token) {
  return apiClient('/admin/backup/status', { token });
}

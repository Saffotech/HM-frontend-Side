/** Doctor consultation queue API — separate from OPD billing queue */

import { apiClient } from '@/shared/api/client';
import {
  normalizeDoctorList,
  unwrapDoctorResponse,
} from '@/shared/api/utils/doctorResponseUtils';

export async function getTodayQueue(token) {
  const response = await apiClient('/queue/today', { token });
  return normalizeDoctorList(unwrapDoctorResponse(response, 'queue'));
}

export async function requestNextPatient(appointmentId, token) {
  return apiClient('/queue/request-next', {
    method: 'POST',
    body: JSON.stringify({ appointment_id: appointmentId }),
    token,
  });
}

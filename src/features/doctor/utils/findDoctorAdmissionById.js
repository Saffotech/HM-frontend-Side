import { getDoctorIpdAdmissions } from '@/features/doctor/api/ipd';
import { apiToUiAppointment } from '@/shared/api/mappers/appointmentMapper';

const PAGE_SIZE = 100;
const MAX_PAGES = 5;

/**
 * Find one admission on the doctor's IPD list. Does not pick a different row.
 */
export async function findDoctorAdmissionById(token, admissionId) {
  const target = Number(admissionId);
  if (!Number.isInteger(target) || target <= 0) return null;

  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const raw = await getDoctorIpdAdmissions(token, {
      status: 'all',
      page,
      page_size: PAGE_SIZE,
    });
    const items = raw?.items ?? [];
    const match = items.find((row) => Number(row?.admission_id) === target);
    if (match) return apiToUiAppointment(match);

    const total = Number(raw?.total ?? 0);
    if (items.length === 0 || page * PAGE_SIZE >= total) break;
  }

  return null;
}

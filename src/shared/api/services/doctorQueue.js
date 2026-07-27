import { getTodayQueue } from '@/features/doctor/api/queue';
import { mapQueueList } from '@/shared/api/mappers/queueMapper';

export async function fetchTodayQueue(token) {
  return mapQueueList(await getTodayQueue(token));
}

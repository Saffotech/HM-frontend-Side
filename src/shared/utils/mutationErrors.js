import { toast } from '@/shared/utils/toast';

export function mutationOnError(err) {
  toast.error(err?.message || 'Action failed. Please try again.');
}

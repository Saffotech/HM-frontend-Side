import { toast } from '@/shared/utils/toast';
import { isSupersededSessionError } from '@/components/security/httpSessionPolicy';

export function mutationOnError(err) {
  if (isSupersededSessionError(err)) return;
  const message = err?.message || 'Action failed. Please try again.';
  if (
    err?.status === 403 &&
    /deletion is disabled by administrator/i.test(message)
  ) {
    toast.error('Delete disabled by Administrator.');
    return;
  }
  toast.error(message);
}

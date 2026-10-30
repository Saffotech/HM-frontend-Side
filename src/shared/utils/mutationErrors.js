import { toast } from '@/shared/utils/toast';
import { isSupersededSessionError } from '@/components/security/httpSessionPolicy';
import { classifyApiError, userFacingMessage } from '@/shared/errors/errorClassification';

export function mutationOnError(err) {
  if (isSupersededSessionError(err)) return;
  if (classifyApiError(err).silent) return;
  const message = userFacingMessage(err, { mutation: true }) || 'Action failed. Please try again.';
  if (
    err?.status === 403 &&
    /deletion is disabled by administrator/i.test(message)
  ) {
    toast.error('Delete disabled by Administrator.');
    return;
  }
  toast.error(message);
}

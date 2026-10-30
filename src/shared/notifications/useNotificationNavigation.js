import { useCallback, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from '@/shared/utils/toast';
import { enrichNotificationDestination } from '@/shared/notifications/enrichNotificationDestination';
import {
  detectNotificationModule,
  isDestinationInModule,
} from '@/shared/notifications/notificationModules';
import { resolveNotificationDestination } from '@/shared/notifications/resolveNotificationDestination';
import { useQueryToken } from '@/shared/hooks/useQueryToken';

function notificationKey(notification) {
  if (notification?.id == null) return null;
  return String(notification.id);
}

/**
 * Mark read when needed, then open the record inside the active module.
 * A failed or skipped mark-as-read call still navigates.
 */
export function useNotificationNavigation(module) {
  const navigate = useNavigate();
  const location = useLocation();
  const token = useQueryToken();
  const inflight = useRef(new Set());

  return useCallback(async (notification, options = {}) => {
    const key = notificationKey(notification);
    if (key && inflight.current.has(key)) return;
    if (key) inflight.current.add(key);

    try {
      const activeModule = module || detectNotificationModule(location.pathname);
      const { markRead, isUnread } = options;
      const unread = typeof isUnread === 'function'
        ? isUnread(notification)
        : notification?.is_read !== true;

      if (unread && typeof markRead === 'function') {
        try {
          await markRead(notification.id);
        } catch {
          /* Navigation does not depend on mark-as-read. */
        }
      }

      let destination = resolveNotificationDestination(notification, activeModule);
      if (destination.status === 'resolve') {
        destination = await enrichNotificationDestination(destination, notification, token);
      }

      if (
        destination.status !== 'navigate'
        || !destination.pathname
        || !isDestinationInModule(activeModule, destination.pathname)
      ) {
        toast.info(destination.message || 'This notification cannot be opened in your current module.');
        return;
      }

      if (destination.message) {
        toast.info(destination.message);
      }

      navigate(
        {
          pathname: destination.pathname,
          search: destination.search || '',
        },
        { state: destination.state || undefined },
      );
    } finally {
      if (key) inflight.current.delete(key);
    }
  }, [location.pathname, module, navigate, token]);
}

/**
 * Manager notifications bell — unread badge from /opd/notifications.
 */

import { useState, useRef, useEffect } from 'react';
import { Bell } from 'lucide-react';
import {
  isAdminNotificationUnread,
  useAdminNotificationsListQuery,
  useAdminNotificationsUnreadCountQuery,
  useMarkAdminNotificationReadMutation,
} from '@/features/manager/hooks/useManagerNotificationsQuery';
import { NOTIFICATION_MODULE } from '@/shared/notifications/notificationModules';
import { useNotificationNavigation } from '@/shared/notifications/useNotificationNavigation';
import ManagerNotificationRow from './ManagerNotificationRow';
import './ManagerNotificationsBell.css';

/* Legacy identifier preserved: AdminNotificationsBell. Active name: ManagerNotificationsBell. */
export default function ManagerNotificationsBell({ onViewAll }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const openNotification = useNotificationNavigation(NOTIFICATION_MODULE.MANAGER);
  const markOne = useMarkAdminNotificationReadMutation();
  const { data: unread = 0 } = useAdminNotificationsUnreadCountQuery();
  const { data: preview } = useAdminNotificationsListQuery({
    page: 1,
    limit: 8,
    is_read: false,
  });
  const notifications = preview?.items ?? [];
  const showBadge = unread > 0;

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const handleViewAll = () => {
    setOpen(false);
    onViewAll?.();
  };

  const handleOpen = (notification) => {
    setOpen(false);
    void openNotification(notification, {
      markRead: (id) => markOne.mutateAsync(id),
      isUnread: isAdminNotificationUnread,
    });
  };

  return (
    <div className="admin-notif-bell" ref={wrapRef}>
      <button
        type="button"
        className="admin-notif-bell__btn"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label={showBadge ? `Notifications, ${unread} unread` : 'Notifications'}
      >
        <Bell size={20} aria-hidden />
        {showBadge && (
          <span className="admin-notif-bell__badge">{unread > 9 ? '9+' : unread}</span>
        )}
      </button>

      {open && (
        <div className="admin-notif-bell__panel" role="dialog" aria-label="Notifications">
          <div className="admin-notif-bell__panel-head">
            <h2 className="admin-notif-bell__panel-title">Notifications</h2>
            <button type="button" className="admin-notif-bell__view-all" onClick={handleViewAll}>
              View all
            </button>
          </div>
          <div className="admin-notif-bell__panel-body">
            {notifications.length === 0 ? (
              <p className="admin-notif-bell__empty">No unread notifications.</p>
            ) : (
              notifications.map((n) => (
                <ManagerNotificationRow
                  key={n.id}
                  notification={n}
                  compact
                  onClick={() => handleOpen(n)}
                />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

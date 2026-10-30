/**
 * Doctor Phase 2 by Atharva —
 * Bell badge from unread-count (polled); preview list from notifications API.
 */

import { useState, useRef, useEffect } from 'react';
import { Bell } from 'lucide-react';
import {
  isDoctorNotificationUnread,
  useDoctorNotificationsListQuery,
  useDoctorNotificationsUnreadCountQuery,
  useMarkDoctorNotificationReadMutation,
} from '@/features/doctor/hooks/useDoctorNotificationsQuery';
import { NOTIFICATION_MODULE } from '@/shared/notifications/notificationModules';
import { useNotificationNavigation } from '@/shared/notifications/useNotificationNavigation';
import NotificationRow from './NotificationRow';
import './DoctorNotificationsBell.css';

export default function DoctorNotificationsBell({ onViewAll }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const openNotification = useNotificationNavigation(NOTIFICATION_MODULE.DOCTOR);
  const markOne = useMarkDoctorNotificationReadMutation();
  const { data: unread = 0 } = useDoctorNotificationsUnreadCountQuery();
  const { data: preview } = useDoctorNotificationsListQuery({
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
      isUnread: isDoctorNotificationUnread,
    });
  };

  return (
    <div className="doctor-notif-bell" ref={wrapRef}>
      <button
        type="button"
        className="doctor-notif-bell__btn"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label={showBadge ? `Notifications, ${unread} unread` : 'Notifications'}
      >
        <Bell size={20} aria-hidden />
        {showBadge && (
          <span className="doctor-notif-bell__badge">{unread > 9 ? '9+' : unread}</span>
        )}
      </button>

      {open && (
        <div className="doctor-notif-bell__panel" role="dialog" aria-label="Notifications">
          <div className="doctor-notif-bell__panel-head">
            <h2 className="doctor-notif-bell__panel-title">Notifications</h2>
            <button type="button" className="doctor-notif-bell__view-all" onClick={handleViewAll}>
              View all
            </button>
          </div>
          <div className="doctor-notif-bell__panel-body">
            {notifications.length === 0 ? (
              <p className="doctor-notif-bell__empty">No unread notifications.</p>
            ) : (
              notifications.map((n) => (
                <NotificationRow key={n.id} notification={n} compact onClick={() => handleOpen(n)} />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

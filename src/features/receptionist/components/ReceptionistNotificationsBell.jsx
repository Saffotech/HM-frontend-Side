/**
 * Receptionist notifications bell — unread badge from /receptionist/notifications.
 */

import { useState, useRef, useEffect } from 'react';
import { Bell } from 'lucide-react';
import {
  useReceptionistNotificationsListQuery,
  useReceptionistNotificationsUnreadCountQuery,
} from '@/features/receptionist/hooks/useReceptionistNotificationsQuery';
import ReceptionistNotificationRow from './ReceptionistNotificationRow';
import './ReceptionistNotificationsBell.css';

export default function ReceptionistNotificationsBell({ onViewAll }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const { data: unread = 0 } = useReceptionistNotificationsUnreadCountQuery();
  const { data: preview } = useReceptionistNotificationsListQuery({
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

  return (
    <div className="receptionist-notif-bell" ref={wrapRef}>
      <button
        type="button"
        className="receptionist-notif-bell__btn"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label={showBadge ? `Notifications, ${unread} unread` : 'Notifications'}
      >
        <Bell size={20} aria-hidden />
        {showBadge && (
          <span className="receptionist-notif-bell__badge">{unread > 9 ? '9+' : unread}</span>
        )}
      </button>

      {open && (
        <div className="receptionist-notif-bell__panel" role="dialog" aria-label="Notifications">
          <div className="receptionist-notif-bell__panel-head">
            <h2 className="receptionist-notif-bell__panel-title">Notifications</h2>
            <button type="button" className="receptionist-notif-bell__view-all" onClick={handleViewAll}>
              View all
            </button>
          </div>
          <div className="receptionist-notif-bell__panel-body">
            {notifications.length === 0 ? (
              <p className="receptionist-notif-bell__empty">No unread notifications.</p>
            ) : (
              notifications.map((n) => (
                <ReceptionistNotificationRow
                  key={n.id}
                  notification={n}
                  compact
                  onClick={handleViewAll}
                />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

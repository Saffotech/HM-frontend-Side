/**
 * Nurse Phase 2 by Atharva —
 * Bell badge from unread-count (polled); preview list from notifications API.
 */

import { useState, useRef, useEffect } from 'react';
import { Bell } from 'lucide-react';
import {
  useNurseNotificationsListQuery,
  useNurseNotificationsUnreadCountQuery,
} from '@/features/nurse/hooks/useNurseNotificationsQuery';
import NurseNotificationRow from './NurseNotificationRow';
import './NurseNotificationsBell.css';

export default function NurseNotificationsBell({ onViewAll }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const { data: unread = 0 } = useNurseNotificationsUnreadCountQuery();
  const { data: preview } = useNurseNotificationsListQuery({
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
    <div className="nurse-notif-bell" ref={wrapRef}>
      <button
        type="button"
        className="nurse-notif-bell__btn"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label={showBadge ? `Notifications, ${unread} unread` : 'Notifications'}
      >
        <Bell size={20} aria-hidden />
        {showBadge && (
          <span className="nurse-notif-bell__badge">{unread > 9 ? '9+' : unread}</span>
        )}
      </button>

      {open && (
        <div className="nurse-notif-bell__panel" role="dialog" aria-label="Notifications">
          <div className="nurse-notif-bell__panel-head">
            <h2 className="nurse-notif-bell__panel-title">Notifications</h2>
            <button type="button" className="nurse-notif-bell__view-all" onClick={handleViewAll}>
              View all
            </button>
          </div>
          <div className="nurse-notif-bell__panel-body">
            {notifications.length === 0 ? (
              <p className="nurse-notif-bell__empty">No unread notifications.</p>
            ) : (
              notifications.map((n) => (
                <NurseNotificationRow
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

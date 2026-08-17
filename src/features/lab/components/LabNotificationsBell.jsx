/**
 * Nurse Phase 2 by Atharva —
 * Bell badge from unread-count (polled); preview list from notifications API.
 */

import { useState, useRef, useEffect } from 'react';
import { Bell } from 'lucide-react';
import {
  sortLabNotificationsNewestFirst,
  useLabTechnicianNotificationsListQuery,
  useLabTechnicianNotificationsUnreadCountQuery,
} from '@/features/lab/hooks/useLabTechnicianNotificationsQuery';
import { useLabPermissionSet } from '@/features/lab/hooks/useLabPermission';
import LabNotificationRow from './LabNotificationRow';
import './LabNotificationsBell.css';

export default function LabNotificationsBell({ onViewAll }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const { canViewNotifications } = useLabPermissionSet();
  const { data: unread = 0 } = useLabTechnicianNotificationsUnreadCountQuery({
    enabled: canViewNotifications,
  });
  const { data: preview } = useLabTechnicianNotificationsListQuery(
    {
      page: 1,
      limit: 8,
      is_read: false,
    },
    { enabled: canViewNotifications && open },
  );
  const notifications = sortLabNotificationsNewestFirst(preview?.items ?? []);
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
    <div className="lab-notif-bell" ref={wrapRef}>
      <button
        type="button"
        className="lab-notif-bell__btn"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label={showBadge ? `Notifications, ${unread} unread` : 'Notifications'}
      >
        <Bell size={20} aria-hidden />
        {showBadge && (
          <span className="lab-notif-bell__badge">{unread > 9 ? '9+' : unread}</span>
        )}
      </button>

      {open && (
        <div className="lab-notif-bell__panel" role="dialog" aria-label="Notifications">
          <div className="lab-notif-bell__panel-head">
            <h2 className="lab-notif-bell__panel-title">Notifications</h2>
            <button type="button" className="lab-notif-bell__view-all" onClick={handleViewAll}>
              View all
            </button>
          </div>
          <div className="lab-notif-bell__panel-body">
            {notifications.length === 0 ? (
              <p className="lab-notif-bell__empty">No unread notifications.</p>
            ) : (
              notifications.map((n) => (
                <LabNotificationRow
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

/**
 * Nurse Phase 2 by Atharva —
 * Bell badge from unread-count (polled); preview list from notifications API.
 */

import { useState, useRef, useEffect } from 'react';
import { Bell } from 'lucide-react';
import {
  usePharmacistNotificationsListQuery,
  usePharmacistNotificationsUnreadCountQuery,
} from '@/features/pharmacy/hooks/usePharmacistNotificationsQuery';
import PharmacyNotificationRow from './PharmacyNotificationRow';
import './PharmacyNotificationsBell.css';

export default function PharmacyNotificationsBell({ onViewAll }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const { data: unread = 0 } = usePharmacistNotificationsUnreadCountQuery();
  const { data: preview } = usePharmacistNotificationsListQuery({
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
    <div className="pharmacy-notif-bell" ref={wrapRef}>
      <button
        type="button"
        className="pharmacy-notif-bell__btn"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label={showBadge ? `Notifications, ${unread} unread` : 'Notifications'}
      >
        <Bell size={20} aria-hidden />
        {showBadge && (
          <span className="pharmacy-notif-bell__badge">{unread > 9 ? '9+' : unread}</span>
        )}
      </button>

      {open && (
        <div className="pharmacy-notif-bell__panel" role="dialog" aria-label="Notifications">
          <div className="pharmacy-notif-bell__panel-head">
            <h2 className="pharmacy-notif-bell__panel-title">Notifications</h2>
            <button type="button" className="pharmacy-notif-bell__view-all" onClick={handleViewAll}>
              View all
            </button>
          </div>
          <div className="pharmacy-notif-bell__panel-body">
            {notifications.length === 0 ? (
              <p className="pharmacy-notif-bell__empty">No unread notifications.</p>
            ) : (
              notifications.map((n) => (
                <PharmacyNotificationRow
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

import { useState, useRef, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { useDoctorNotificationsQuery } from '@/features/doctor/hooks/useDoctorQuery';
import NotificationRow from './NotificationRow';
import './DoctorNotificationsBell.css';

export default function DoctorNotificationsBell({ onViewAll }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const { data: notifications = [], isError } = useDoctorNotificationsQuery();
  const unavailable = isError;
  const unread = unavailable ? 0 : notifications.filter((n) => !n.read).length;
  const showBadge = unread > 0 && !unavailable;

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
        {showBadge && <span className="doctor-notif-bell__badge">{unread > 9 ? '9+' : unread}</span>}
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
              <p className="doctor-notif-bell__empty">No notifications right now.</p>
            ) : (
              notifications.slice(0, 8).map((n) => (
                <NotificationRow key={n.id} notification={n} compact />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

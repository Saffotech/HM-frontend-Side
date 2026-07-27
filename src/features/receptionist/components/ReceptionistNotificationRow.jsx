/**
 * Receptionist notification row — SHIFT_UPDATED / ADMIN_UPDATE.
 */

import { Bell, CalendarDays, Shield } from 'lucide-react';
import { isReceptionistNotificationUnread } from '@/features/receptionist/hooks/useReceptionistNotificationsQuery';

const TYPE_ICON = {
  SHIFT_UPDATED: { icon: CalendarDays, tint: 'receptionist-notif-icon--blue' },
  ADMIN_UPDATE: { icon: Shield, tint: 'receptionist-notif-icon--muted' },
};

const PRIORITY_CLASS = {
  CRITICAL: 'receptionist-notif-priority--critical',
  HIGH: 'receptionist-notif-priority--high',
  NORMAL: 'receptionist-notif-priority--normal',
};

function formatRelativeTime(iso) {
  if (!iso) return '';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return iso;
  const diffSec = Math.round((Date.now() - then) / 1000);
  if (diffSec < 60) return 'Just now';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function ReceptionistNotificationRow({ notification: n, compact, onClick }) {
  // Nurse Phase 2 by Atharva — shared unread helper (API is_read + legacy read)
  const unread = isReceptionistNotificationUnread(n);
  const message = n.message ?? n.body;
  const createdAt = n.created_at ?? n.at;
  const kind = TYPE_ICON[n.notification_type] || { icon: Bell, tint: 'receptionist-notif-icon--muted' };
  const Icon = kind.icon;
  const priorityClass = PRIORITY_CLASS[n.priority] || PRIORITY_CLASS.NORMAL;

  return (
    <button
      type="button"
      className={`receptionist-notif ${unread ? '' : 'receptionist-notif--read'} ${priorityClass}`}
      onClick={onClick}
    >
      <div className={`receptionist-notif__icon ${kind.tint}`}>
        <Icon size={16} />
      </div>
      <div className="receptionist-notif__body">
        <div className="receptionist-notif__title-row">
          <span className="receptionist-notif__title" style={{ fontSize: compact ? '0.8125rem' : '0.875rem' }}>
            {n.title}
          </span>
          {unread ? <span className="receptionist-notif__dot" aria-hidden /> : null}
        </div>
        {message ? <div className="receptionist-notif__message">{message}</div> : null}
        <div className="receptionist-notif__meta">
          {n.priority ? (
            <span className={`receptionist-notif-chip ${priorityClass}`}>{n.priority}</span>
          ) : null}
          {n.notification_type ? (
            <span>{String(n.notification_type).replace(/_/g, ' ')}</span>
          ) : null}
          <span>{formatRelativeTime(createdAt)}</span>
        </div>
      </div>
    </button>
  );
}

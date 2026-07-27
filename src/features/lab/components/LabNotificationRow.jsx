/**
 * Nurse Phase 2 by Atharva —
 * Notification row for real API fields (is_read, priority, message, type).
 */

import { Bell, CalendarDays, FlaskConical, Shield, XCircle } from 'lucide-react';
import { isLabTechnicianNotificationUnread } from '@/features/lab/hooks/useLabTechnicianNotificationsQuery';

const TYPE_ICON = {
  LAB_ORDER_CREATED: { icon: FlaskConical, tint: 'lab-notif-icon--violet' },
  LAB_ORDER_CANCELLED: { icon: XCircle, tint: 'lab-notif-icon--red' },
  SHIFT_UPDATED: { icon: CalendarDays, tint: 'lab-notif-icon--blue' },
  ADMIN_UPDATE: { icon: Shield, tint: 'lab-notif-icon--muted' },
};

const PRIORITY_CLASS = {
  CRITICAL: 'lab-notif-priority--critical',
  HIGH: 'lab-notif-priority--high',
  NORMAL: 'lab-notif-priority--normal',
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

export default function LabNotificationRow({ notification: n, compact, onClick }) {
  // Nurse Phase 2 by Atharva — shared unread helper (API is_read + legacy read)
  const unread = isLabTechnicianNotificationUnread(n);
  const message = n.message ?? n.body;
  const createdAt = n.created_at ?? n.at;
  const kind = TYPE_ICON[n.notification_type] || { icon: Bell, tint: 'lab-notif-icon--muted' };
  const Icon = kind.icon;
  const priorityClass = PRIORITY_CLASS[n.priority] || PRIORITY_CLASS.NORMAL;

  return (
    <button
      type="button"
      className={`lab-notif ${unread ? '' : 'lab-notif--read'} ${priorityClass}`}
      onClick={onClick}
    >
      <div className={`lab-notif__icon ${kind.tint}`}>
        <Icon size={16} />
      </div>
      <div className="lab-notif__body">
        <div className="lab-notif__title-row">
          <span className="lab-notif__title" style={{ fontSize: compact ? '0.8125rem' : '0.875rem' }}>
            {n.title}
          </span>
          {unread ? <span className="lab-notif__dot" aria-hidden /> : null}
        </div>
        {message ? <div className="lab-notif__message">{message}</div> : null}
        <div className="lab-notif__meta">
          {n.priority ? (
            <span className={`lab-notif-chip ${priorityClass}`}>{n.priority}</span>
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

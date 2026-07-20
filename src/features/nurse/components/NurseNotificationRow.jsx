/**
 * Nurse Phase 2 by Atharva —
 * Notification row for real API fields (is_read, priority, message, type).
 */

import { AlertTriangle, Bell, CalendarDays, ClipboardList, Shield } from 'lucide-react';
import { isNurseNotificationUnread } from '@/features/nurse/hooks/useNurseNotificationsQuery';

const TYPE_ICON = {
  EMERGENCY_ALERT: { icon: AlertTriangle, tint: 'nurse-notif-icon--red' },
  HANDOVER_TAKEN_OVER: { icon: ClipboardList, tint: 'nurse-notif-icon--teal' },
  SHIFT_UPDATED: { icon: CalendarDays, tint: 'nurse-notif-icon--blue' },
  ADMIN_UPDATE: { icon: Shield, tint: 'nurse-notif-icon--muted' },
};

const PRIORITY_CLASS = {
  CRITICAL: 'nurse-notif-priority--critical',
  HIGH: 'nurse-notif-priority--high',
  NORMAL: 'nurse-notif-priority--normal',
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

export default function NurseNotificationRow({ notification: n, compact, onClick }) {
  // Nurse Phase 2 by Atharva — shared unread helper (API is_read + legacy read)
  const unread = isNurseNotificationUnread(n);
  const message = n.message ?? n.body;
  const createdAt = n.created_at ?? n.at;
  const kind = TYPE_ICON[n.notification_type] || { icon: Bell, tint: 'nurse-notif-icon--muted' };
  const Icon = kind.icon;
  const priorityClass = PRIORITY_CLASS[n.priority] || PRIORITY_CLASS.NORMAL;

  return (
    <button
      type="button"
      className={`nurse-notif ${unread ? '' : 'nurse-notif--read'} ${priorityClass}`}
      onClick={onClick}
    >
      <div className={`nurse-notif__icon ${kind.tint}`}>
        <Icon size={16} />
      </div>
      <div className="nurse-notif__body">
        <div className="nurse-notif__title-row">
          <span className="nurse-notif__title" style={{ fontSize: compact ? '0.8125rem' : '0.875rem' }}>
            {n.title}
          </span>
          {unread ? <span className="nurse-notif__dot" aria-hidden /> : null}
        </div>
        {message ? <div className="nurse-notif__message">{message}</div> : null}
        <div className="nurse-notif__meta">
          {n.priority ? (
            <span className={`nurse-notif-chip ${priorityClass}`}>{n.priority}</span>
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

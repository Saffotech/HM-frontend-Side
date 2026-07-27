/**
 * Nurse Phase 2 by Atharva —
 * Notification row for real API fields (is_read, priority, message, type).
 */

import { Bell, CalendarDays, Pill, Shield, RefreshCw } from 'lucide-react';
import { isPharmacistNotificationUnread } from '@/features/pharmacy/hooks/usePharmacistNotificationsQuery';

const TYPE_ICON = {
  PRESCRIPTION_CREATED: { icon: Pill, tint: 'pharmacy-notif-icon--teal' },
  PRESCRIPTION_UPDATED: { icon: RefreshCw, tint: 'pharmacy-notif-icon--blue' },
  SHIFT_UPDATED: { icon: CalendarDays, tint: 'pharmacy-notif-icon--blue' },
  ADMIN_UPDATE: { icon: Shield, tint: 'pharmacy-notif-icon--muted' },
};

const PRIORITY_CLASS = {
  CRITICAL: 'pharmacy-notif-priority--critical',
  HIGH: 'pharmacy-notif-priority--high',
  NORMAL: 'pharmacy-notif-priority--normal',
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

export default function PharmacyNotificationRow({ notification: n, compact, onClick }) {
  // Nurse Phase 2 by Atharva — shared unread helper (API is_read + legacy read)
  const unread = isPharmacistNotificationUnread(n);
  const message = n.message ?? n.body;
  const createdAt = n.created_at ?? n.at;
  const kind = TYPE_ICON[n.notification_type] || { icon: Bell, tint: 'pharmacy-notif-icon--muted' };
  const Icon = kind.icon;
  const priorityClass = PRIORITY_CLASS[n.priority] || PRIORITY_CLASS.NORMAL;

  return (
    <button
      type="button"
      className={`pharmacy-notif ${unread ? '' : 'pharmacy-notif--read'} ${priorityClass}`}
      onClick={onClick}
    >
      <div className={`pharmacy-notif__icon ${kind.tint}`}>
        <Icon size={16} />
      </div>
      <div className="pharmacy-notif__body">
        <div className="pharmacy-notif__title-row">
          <span className="pharmacy-notif__title" style={{ fontSize: compact ? '0.8125rem' : '0.875rem' }}>
            {n.title}
          </span>
          {unread ? <span className="pharmacy-notif__dot" aria-hidden /> : null}
        </div>
        {message ? <div className="pharmacy-notif__message">{message}</div> : null}
        <div className="pharmacy-notif__meta">
          {n.priority ? (
            <span className={`pharmacy-notif-chip ${priorityClass}`}>{n.priority}</span>
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

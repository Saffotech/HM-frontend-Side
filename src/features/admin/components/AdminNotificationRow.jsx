/**
 * Hospital Admin notification row.
 */

import { AlertOctagon, AlertTriangle, Bell, CalendarDays, Shield } from 'lucide-react';
import { isAdminNotificationUnread } from '@/features/admin/hooks/useAdminNotificationsQuery';

const TYPE_ICON = {
  SHIFT_UPDATED: { icon: CalendarDays, tint: 'admin-notif-icon--blue' },
  ADMIN_UPDATE: { icon: Shield, tint: 'admin-notif-icon--muted' },
  EMERGENCY_ALERT: { icon: AlertOctagon, tint: 'admin-notif-icon--red' },
  QUEUE_ENQUEUE_FAILED: { icon: AlertTriangle, tint: 'admin-notif-icon--red' },
};

const PRIORITY_CLASS = {
  CRITICAL: 'admin-notif-priority--critical',
  HIGH: 'admin-notif-priority--high',
  NORMAL: 'admin-notif-priority--normal',
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

export default function AdminNotificationRow({ notification: n, compact, onClick }) {
  const unread = isAdminNotificationUnread(n);
  const message = n.message ?? n.body;
  const createdAt = n.created_at ?? n.at;
  const kind = TYPE_ICON[n.notification_type] || { icon: Bell, tint: 'admin-notif-icon--muted' };
  const Icon = kind.icon;
  const priorityClass = PRIORITY_CLASS[n.priority] || PRIORITY_CLASS.NORMAL;

  return (
    <button
      type="button"
      className={`admin-notif ${unread ? '' : 'admin-notif--read'} ${priorityClass}`}
      onClick={onClick}
    >
      <div className={`admin-notif__icon ${kind.tint}`}>
        <Icon size={16} />
      </div>
      <div className="admin-notif__body">
        <div className="admin-notif__title-row">
          <span className="admin-notif__title" style={{ fontSize: compact ? '0.8125rem' : '0.875rem' }}>
            {n.title}
          </span>
          {unread ? <span className="admin-notif__dot" aria-hidden /> : null}
        </div>
        {message ? <div className="admin-notif__message">{message}</div> : null}
        <div className="admin-notif__meta">
          {n.priority ? (
            <span className={`admin-notif-chip ${priorityClass}`}>{n.priority}</span>
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

/**
 * OPD Billing notification row.
 */

import { AlertTriangle, Bell, CalendarDays, CreditCard, Shield, UserX } from 'lucide-react';
import { isOpdBillingNotificationUnread } from '@/features/opd/hooks/useOpdBillingNotificationsQuery';

const TYPE_ICON = {
  SHIFT_UPDATED: { icon: CalendarDays, tint: 'opd-notif-icon--blue' },
  ADMIN_UPDATE: { icon: Shield, tint: 'opd-notif-icon--muted' },
  PAYMENT_PENDING: { icon: CreditCard, tint: 'opd-notif-icon--teal' },
  QUEUE_ENQUEUE_FAILED: { icon: AlertTriangle, tint: 'opd-notif-icon--red' },
  APPOINTMENT_NO_SHOW: { icon: UserX, tint: 'opd-notif-icon--muted' },
};

const PRIORITY_CLASS = {
  CRITICAL: 'opd-notif-priority--critical',
  HIGH: 'opd-notif-priority--high',
  NORMAL: 'opd-notif-priority--normal',
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

export default function OpdNotificationRow({ notification: n, compact, onClick }) {
  const unread = isOpdBillingNotificationUnread(n);
  const message = n.message ?? n.body;
  const createdAt = n.created_at ?? n.at;
  const kind = TYPE_ICON[n.notification_type] || { icon: Bell, tint: 'opd-notif-icon--muted' };
  const Icon = kind.icon;
  const priorityClass = PRIORITY_CLASS[n.priority] || PRIORITY_CLASS.NORMAL;

  return (
    <button
      type="button"
      className={`opd-notif ${unread ? '' : 'opd-notif--read'} ${priorityClass}`}
      onClick={onClick}
    >
      <div className={`opd-notif__icon ${kind.tint}`}>
        <Icon size={16} />
      </div>
      <div className="opd-notif__body">
        <div className="opd-notif__title-row">
          <span className="opd-notif__title" style={{ fontSize: compact ? '0.8125rem' : '0.875rem' }}>
            {n.title}
          </span>
          {unread ? <span className="opd-notif__dot" aria-hidden /> : null}
        </div>
        {message ? <div className="opd-notif__message">{message}</div> : null}
        <div className="opd-notif__meta">
          {n.priority ? (
            <span className={`opd-notif-chip ${priorityClass}`}>{n.priority}</span>
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

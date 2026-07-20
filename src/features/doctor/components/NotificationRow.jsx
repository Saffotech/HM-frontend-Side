/**
 * Doctor Phase 2 by Atharva —
 * Notification row for real API fields (is_read, priority, message, type).
 */

import { AlertTriangle, Bell, CalendarDays, FlaskConical, Shield, Users } from 'lucide-react';
import { isDoctorNotificationUnread } from '@/features/doctor/hooks/useDoctorNotificationsQuery';

const TYPE_ICON = {
  EMERGENCY_ALERT: { icon: AlertTriangle, tint: 'doc-notif-icon--red' },
  LAB_REPORT_READY: { icon: FlaskConical, tint: 'doc-notif-icon--violet' },
  LAB_REPORT_UPDATED: { icon: FlaskConical, tint: 'doc-notif-icon--violet' },
  NEW_APPOINTMENT: { icon: Users, tint: 'doc-notif-icon--blue' },
  PATIENT_CHECKED_IN: { icon: Users, tint: 'doc-notif-icon--blue' },
  APPOINTMENT_CANCELLED: { icon: CalendarDays, tint: 'doc-notif-icon--muted' },
  APPOINTMENT_RESCHEDULED: { icon: CalendarDays, tint: 'doc-notif-icon--muted' },
  ADMIN_UPDATE: { icon: Shield, tint: 'doc-notif-icon--muted' },
  HANDOVER_TAKEN_OVER: { icon: CalendarDays, tint: 'doc-notif-icon--muted' },
  SHIFT_UPDATED: { icon: CalendarDays, tint: 'doc-notif-icon--muted' },
};

const PRIORITY_CLASS = {
  CRITICAL: 'doc-notif-priority--critical',
  HIGH: 'doc-notif-priority--high',
  NORMAL: 'doc-notif-priority--normal',
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

export default function NotificationRow({ notification: n, compact, onClick }) {
  // Doctor Phase 2 by Atharva — shared unread helper (API is_read + legacy read)
  const unread = isDoctorNotificationUnread(n);
  const message = n.message ?? n.body;
  const createdAt = n.created_at ?? n.at;
  const kind = TYPE_ICON[n.notification_type] || { icon: Bell, tint: 'doc-notif-icon--muted' };
  const Icon = kind.icon;
  const priorityClass = PRIORITY_CLASS[n.priority] || PRIORITY_CLASS.NORMAL;

  return (
    <button
      type="button"
      className={`doc-notif ${unread ? '' : 'doc-notif--read'} ${priorityClass}`}
      onClick={onClick}
    >
      <div className={`doc-stat__icon ${kind.tint}`} style={{ width: '2rem', height: '2rem' }}>
        <Icon size={16} />
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem' }}>
          <span style={{ fontWeight: 600, fontSize: compact ? '0.8125rem' : '0.875rem' }}>
            {n.title}
          </span>
          {unread ? (
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: 'var(--color-primary)',
                flexShrink: 0,
              }}
            />
          ) : null}
        </div>
        {message ? (
          <div
            className="text-muted"
            style={{ fontSize: '0.75rem', whiteSpace: 'pre-wrap' }}
          >
            {message}
          </div>
        ) : null}
        <div
          className="text-muted"
          style={{ fontSize: '0.6875rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}
        >
          {n.priority ? <span className={`doc-notif-chip ${priorityClass}`}>{n.priority}</span> : null}
          {n.notification_type ? <span>{String(n.notification_type).replace(/_/g, ' ')}</span> : null}
          <span>{formatRelativeTime(createdAt)}</span>
        </div>
      </div>
    </button>
  );
}

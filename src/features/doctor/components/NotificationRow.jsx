import { AlertTriangle, Bell, CalendarDays, FlaskConical, Users } from 'lucide-react';

const KIND_MAP = {
  emergency: { icon: AlertTriangle, tint: 'doc-notif-icon--red' },
  lab: { icon: FlaskConical, tint: 'doc-notif-icon--violet' },
  patient: { icon: Users, tint: 'doc-notif-icon--blue' },
  cancel: { icon: CalendarDays, tint: 'doc-notif-icon--muted' },
  info: { icon: Bell, tint: 'doc-notif-icon--muted' },
};

export default function NotificationRow({ notification: n, compact, onClick }) {
  const { icon: Icon, tint } = KIND_MAP[n.kind] || KIND_MAP.info;
  return (
    <button
      type="button"
      className={`doc-notif ${n.read ? 'doc-notif--read' : ''}`}
      onClick={onClick}
    >
      <div className={`doc-stat__icon ${tint}`} style={{ width: '2rem', height: '2rem' }}>
        <Icon size={16} />
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem' }}>
          <span style={{ fontWeight: 600, fontSize: compact ? '0.8125rem' : '0.875rem' }}>{n.title}</span>
          {!n.read && <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-primary)', flexShrink: 0 }} />}
        </div>
        {n.body && <div className="text-muted" style={{ fontSize: '0.75rem' }}>{n.body}</div>}
        <div className="text-muted" style={{ fontSize: '0.6875rem' }}>{n.at}</div>
      </div>
    </button>
  );
}

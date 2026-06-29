import { useDoctorNotificationsQuery, useUpdateNotificationsMutation } from '@/features/doctor/hooks/useDoctorQuery';
import { Bell } from 'lucide-react';
import { Button, EmptyState } from '@/shared/components/common';
import { toast } from '@/shared/utils/toast';
import NotificationRow from './NotificationRow';
import '../styles/doctor-ui.css';

export default function NotificationsSection() {
  const { data: notifications = [] } = useDoctorNotificationsQuery();
  const updateNotifications = useUpdateNotificationsMutation();

  return (
    <div className="doc-page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0, fontSize: '1.125rem' }}>Notifications</h2>
        <Button size="sm" variant="outline" onClick={() => {
          updateNotifications.mutate((prev) => prev.map((n) => ({ ...n, read: true })));
          toast.success('All marked as read');
        }}>Mark all read</Button>
      </div>
      <div className="doc-card">
        <div className="doc-card__body" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {notifications.length === 0 ? (
            <EmptyState
              icon={Bell}
              title="All caught up"
              description="No new notifications"
            />
          ) : (
          notifications.map((n) => (
            <NotificationRow
              key={n.id}
              notification={n}
              onClick={() => updateNotifications.mutate((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)))}
            />
          ))
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Doctor Phase 2 by Atharva —
 * Notifications inbox using GET /doctor/notifications + mark-read APIs.
 */

import { useEffect, useMemo, useState } from 'react';
import { Bell, Search, X } from 'lucide-react';
import {
  isDoctorNotificationRead,
  isDoctorNotificationUnread,
  sortDoctorNotificationsNewestFirst,
  useDoctorNotificationsListQuery,
  useMarkAllDoctorNotificationsReadMutation,
  useMarkDoctorNotificationReadMutation,
} from '@/features/doctor/hooks/useDoctorNotificationsQuery';
import { Button, EmptyState } from '@/shared/components/common';
import { toast } from '@/shared/utils/toast';
import NotificationRow from './NotificationRow';
import '../styles/doctor-ui.css';
import './NotificationsSection.css';

const TYPE_FILTERS = [
  { value: '', label: 'All types', kind: 'all' },
  { value: 'NEW_APPOINTMENT', label: 'New appointment', kind: 'type' },
  { value: 'APPOINTMENT_CANCELLED', label: 'Cancelled', kind: 'type' },
  { value: 'APPOINTMENT_RESCHEDULED', label: 'Rescheduled', kind: 'type' },
  { value: 'LAB_REPORT_READY', label: 'Lab ready', kind: 'type' },
  { value: 'EMERGENCY_ALERT', label: 'Emergency', kind: 'type' },
  { value: 'ADMIN_UPDATE', label: 'Admin', kind: 'type' },
  { value: 'HANDOVER_TAKEN_OVER', label: 'Handover', kind: 'type' },
  { value: 'SHIFT_UPDATED', label: 'Shift updated', kind: 'type' },
  // Doctor Phase 2 by Atharva — priority options in the same filter dropdown
  { value: 'CRITICAL', label: 'Critical', kind: 'priority' },
  { value: 'HIGH', label: 'High', kind: 'priority' },
  { value: 'NORMAL', label: 'Normal', kind: 'priority' },
];

const PRIORITY_FILTER_VALUES = new Set(
  TYPE_FILTERS.filter((t) => t.kind === 'priority').map((t) => t.value)
);

/** Doctor Phase 2 by Atharva — debounce live search so typing does not spam the API */
const SEARCH_DEBOUNCE_MS = 300;

export default function NotificationsSection({ onDeepLink }) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [readFilter, setReadFilter] = useState('all');
  const [notificationType, setNotificationType] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Doctor Phase 2 by Atharva — dynamic search (no submit button); debounce then filter
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const next = search.trim();
      setDebouncedSearch(next);
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [search]);

  const filters = useMemo(() => {
    const next = { page, limit: 20 };
    if (debouncedSearch) next.search = debouncedSearch;
    if (readFilter === 'unread') next.is_read = false;
    if (readFilter === 'read') next.is_read = true;
    if (notificationType) {
      // Doctor Phase 2 by Atharva — type dropdown also filters by priority
      if (PRIORITY_FILTER_VALUES.has(notificationType)) {
        next.priority = notificationType;
      } else {
        next.notification_type = notificationType;
      }
    }
    if (startDate) next.start_date = startDate;
    if (endDate) next.end_date = endDate;
    return next;
  }, [page, debouncedSearch, readFilter, notificationType, startDate, endDate]);

  const { data, isLoading, isError, error, refetch } = useDoctorNotificationsListQuery(filters);
  const markOne = useMarkDoctorNotificationReadMutation();
  const markAll = useMarkAllDoctorNotificationsReadMutation();

  // Doctor Phase 2 by Atharva — client-side guard so Unread never shows already-read rows
  // even if the API omits/ignores is_read or returns a mixed page.
  const items = useMemo(() => {
    let list = data?.items ?? [];
    if (readFilter === 'unread') {
      list = list.filter((n) => isDoctorNotificationUnread(n));
    } else if (readFilter === 'read') {
      list = list.filter((n) => isDoctorNotificationRead(n));
    }
    if (PRIORITY_FILTER_VALUES.has(notificationType)) {
      list = list.filter(
        (n) => String(n.priority || '').toUpperCase() === notificationType
      );
    }
    return sortDoctorNotificationsNewestFirst(list);
  }, [data?.items, readFilter, notificationType]);

  const total = data?.total ?? items.length;
  const limit = data?.limit ?? 20;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  const handleMarkAll = async () => {
    try {
      await markAll.mutateAsync();
      toast.success('All marked as read');
    } catch {
      /* toasted */
    }
  };

  // Doctor Phase 2 by Atharva — Clear filters for search + type + date range
  const hasActiveFilters =
    Boolean(search.trim()) ||
    Boolean(debouncedSearch) ||
    Boolean(notificationType) ||
    Boolean(startDate) ||
    Boolean(endDate);

  const handleClearFilters = () => {
    setSearch('');
    setDebouncedSearch('');
    setNotificationType('');
    setStartDate('');
    setEndDate('');
    setPage(1);
  };

  const handleRowClick = async (n) => {
    if (isDoctorNotificationUnread(n)) {
      try {
        await markOne.mutateAsync(n.id);
      } catch {
        return;
      }
    }
    onDeepLink?.(n);
  };

  return (
    <div className="doc-page doc-notif-page">
      <div className="doc-notif-filters">
        {/* Doctor Phase 2 by Atharva — search first; live filter as user types */}
        <div className="doc-notif-search">
          <Search size={16} className="doc-notif-search__icon" aria-hidden />
          <input
            className="doc-notif-search__input"
            type="search"
            placeholder="Search title, message, or sender…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search notifications"
          />
        </div>
        {/* Doctor Phase 2 by Atharva — order: All → Unread → Read → Mark all read → All types */}
        <div className="doc-notif-filters__row">
          <div className="doc-notif-filters__tabs">
            {[
              { id: 'all', label: 'All' },
              { id: 'unread', label: 'Unread' },
              { id: 'read', label: 'Read' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`doc-notif-filter-tab${readFilter === tab.id ? ' is-active' : ''}`}
                onClick={() => {
                  setReadFilter(tab.id);
                  setPage(1);
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <Button
            size="sm"
            variant="outline"
            className="doc-notif-mark-all"
            onClick={handleMarkAll}
            disabled={markAll.isPending}
          >
            Mark all read
          </Button>
          <select
            className="doc-notif-select"
            value={notificationType}
            onChange={(e) => {
              setNotificationType(e.target.value);
              setPage(1);
            }}
            aria-label="Notification type or priority"
          >
            {TYPE_FILTERS.map((t) => (
              <option key={t.value || 'all'} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
          <label className="doc-notif-date">
            <span className="doc-notif-date__label">From</span>
            <input
              type="date"
              className="doc-notif-date__input"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPage(1);
              }}
              aria-label="Start date"
            />
          </label>
          <label className="doc-notif-date">
            <span className="doc-notif-date__label">To</span>
            <input
              type="date"
              className="doc-notif-date__input"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPage(1);
              }}
              aria-label="End date"
            />
          </label>
          {hasActiveFilters ? (
            <Button
              size="sm"
              variant="outline"
              className="doc-notif-clear-filters"
              onClick={handleClearFilters}
              type="button"
            >
              <X size={12} aria-hidden />
              Clear filters
            </Button>
          ) : null}
        </div>
      </div>

      <div className="doc-card">
        <div className="doc-card__body">
          {isLoading ? (
            <p className="text-muted">Loading notifications…</p>
          ) : isError ? (
            <EmptyState
              icon={Bell}
              title="Could not load notifications"
              description={
                error?.message
                || (error?.status === 403
                  ? "You don't have permission to view notifications."
                  : 'Something went wrong. Please try again.')
              }
            />
          ) : items.length === 0 ? (
            <EmptyState
              icon={Bell}
              title="All caught up"
              description="No notifications match these filters"
            />
          ) : (
            items.map((n) => (
              <NotificationRow key={n.id} notification={n} onClick={() => handleRowClick(n)} />
            ))
          )}
          {isError ? (
            <div style={{ marginTop: '0.75rem' }}>
              <Button size="sm" variant="primary" onClick={() => refetch()}>
                Try again
              </Button>
            </div>
          ) : null}
        </div>
      </div>

      {totalPages > 1 ? (
        <div className="doc-notif-pagination">
          <Button
            size="sm"
            variant="outline"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </Button>
          <span className="text-muted">
            Page {page} of {totalPages} · {total} total
          </span>
          <Button
            size="sm"
            variant="outline"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      ) : null}
    </div>
  );
}

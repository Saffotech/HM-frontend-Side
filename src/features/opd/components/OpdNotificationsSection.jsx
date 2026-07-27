/**
 * OPD Billing notifications inbox against live /opd/notifications APIs.
 */

import { useEffect, useMemo, useState } from 'react';
import { Bell, Search, X } from 'lucide-react';
import {
  isOpdBillingNotificationRead,
  isOpdBillingNotificationUnread,
  useOpdBillingNotificationsListQuery,
  useMarkAllOpdBillingNotificationsReadMutation,
  useMarkOpdBillingNotificationReadMutation,
} from '@/features/opd/hooks/useOpdBillingNotificationsQuery';
import { Button, EmptyState } from '@/shared/components/common';
import { toast } from '@/shared/utils/toast';
import OpdNotificationRow from './OpdNotificationRow';
import './OpdNotificationsBell.css';
import './OpdNotificationsSection.css';

const TYPE_FILTERS = [
  { value: '', label: 'All types', kind: 'all' },
  { value: 'PAYMENT_PENDING', label: 'Payment pending', kind: 'type' },
  { value: 'QUEUE_ENQUEUE_FAILED', label: 'Queue failed', kind: 'type' },
  { value: 'APPOINTMENT_NO_SHOW', label: 'No-show', kind: 'type' },
  { value: 'SHIFT_UPDATED', label: 'Shift updated', kind: 'type' },
  { value: 'ADMIN_UPDATE', label: 'Admin', kind: 'type' },
  { value: 'HIGH', label: 'High', kind: 'priority' },
  { value: 'NORMAL', label: 'Normal', kind: 'priority' },
];

const PRIORITY_FILTER_VALUES = new Set(
  TYPE_FILTERS.filter((t) => t.kind === 'priority').map((t) => t.value)
);

const SEARCH_DEBOUNCE_MS = 300;

export default function OpdNotificationsSection({ onDeepLink }) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [readFilter, setReadFilter] = useState('all');
  const [notificationType, setNotificationType] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

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

  const { data, isLoading, isError, error, refetch } = useOpdBillingNotificationsListQuery(filters);
  const markOne = useMarkOpdBillingNotificationReadMutation();
  const markAll = useMarkAllOpdBillingNotificationsReadMutation();

  const items = useMemo(() => {
    let list = data?.items ?? [];
    if (readFilter === 'unread') {
      list = list.filter((n) => isOpdBillingNotificationUnread(n));
    } else if (readFilter === 'read') {
      list = list.filter((n) => isOpdBillingNotificationRead(n));
    }
    if (PRIORITY_FILTER_VALUES.has(notificationType)) {
      list = list.filter(
        (n) => String(n.priority || '').toUpperCase() === notificationType
      );
    }
    return list;
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
    if (isOpdBillingNotificationUnread(n)) {
      try {
        await markOne.mutateAsync(n.id);
      } catch {
        return;
      }
    }
    onDeepLink?.(n);
  };

  return (
    <div className="opd-notif-page">
      <div className="opd-notif-filters">
        <div className="opd-notif-search">
          <Search size={16} className="opd-notif-search__icon" aria-hidden />
          <input
            className="opd-notif-search__input"
            type="search"
            placeholder="Search title, message, or sender…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search notifications"
          />
        </div>
        <div className="opd-notif-filters__row">
          <div className="opd-notif-filters__tabs">
            {[
              { id: 'all', label: 'All' },
              { id: 'unread', label: 'Unread' },
              { id: 'read', label: 'Read' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`opd-notif-filter-tab${readFilter === tab.id ? ' is-active' : ''}`}
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
            className="opd-notif-mark-all"
            onClick={handleMarkAll}
            disabled={markAll.isPending}
          >
            Mark all read
          </Button>
          <select
            className="opd-notif-select"
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
          <label className="opd-notif-date">
            <span className="opd-notif-date__label">From</span>
            <input
              type="date"
              className="opd-notif-date__input"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPage(1);
              }}
              aria-label="Start date"
            />
          </label>
          <label className="opd-notif-date">
            <span className="opd-notif-date__label">To</span>
            <input
              type="date"
              className="opd-notif-date__input"
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
              className="opd-notif-clear-filters"
              onClick={handleClearFilters}
              type="button"
            >
              <X size={12} aria-hidden />
              Clear filters
            </Button>
          ) : null}
        </div>
      </div>

      <div className="opd-notif-card">
        <div className="opd-notif-card__body">
          {isLoading ? (
            <p className="opd-notif-muted">Loading notifications…</p>
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
              <OpdNotificationRow
                key={n.id}
                notification={n}
                onClick={() => handleRowClick(n)}
              />
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
        <div className="opd-notif-pagination">
          <Button
            size="sm"
            variant="outline"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </Button>
          <span className="opd-notif-muted">
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

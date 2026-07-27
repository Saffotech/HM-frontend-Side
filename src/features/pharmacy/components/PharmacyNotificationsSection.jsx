/**
 * Nurse Phase 2 by Atharva —
 * Notifications inbox using GET /nurse/notifications + mark-read APIs.
 */

import { useEffect, useMemo, useState } from 'react';
import { Bell, Search, X } from 'lucide-react';
import {
  isPharmacistNotificationRead,
  isPharmacistNotificationUnread,
  usePharmacistNotificationsListQuery,
  useMarkAllPharmacistNotificationsReadMutation,
  useMarkPharmacistNotificationReadMutation,
} from '@/features/pharmacy/hooks/usePharmacistNotificationsQuery';
import { Button, EmptyState } from '@/shared/components/common';
import { toast } from '@/shared/utils/toast';
import PharmacyNotificationRow from './PharmacyNotificationRow';
import './PharmacyNotificationsBell.css';
import './PharmacyNotificationsSection.css';

const TYPE_FILTERS = [
  { value: '', label: 'All types', kind: 'all' },
  { value: 'PRESCRIPTION_CREATED', label: 'New prescription', kind: 'type' },
  { value: 'PRESCRIPTION_UPDATED', label: 'Updated', kind: 'type' },
  { value: 'SHIFT_UPDATED', label: 'Shift updated', kind: 'type' },
  { value: 'ADMIN_UPDATE', label: 'Admin', kind: 'type' },
  { value: 'CRITICAL', label: 'Critical', kind: 'priority' },
  { value: 'HIGH', label: 'High', kind: 'priority' },
  { value: 'NORMAL', label: 'Normal', kind: 'priority' },
];

const PRIORITY_FILTER_VALUES = new Set(
  TYPE_FILTERS.filter((t) => t.kind === 'priority').map((t) => t.value)
);

/** Nurse Phase 2 by Atharva — debounce live search so typing does not spam the API */
const SEARCH_DEBOUNCE_MS = 300;

export default function PharmacyNotificationsSection({ onDeepLink }) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [readFilter, setReadFilter] = useState('all');
  const [notificationType, setNotificationType] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Nurse Phase 2 by Atharva — dynamic search (no submit button); debounce then filter
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
      // Nurse Phase 2 by Atharva — type dropdown also filters by priority
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

  const { data, isLoading, isError, error, refetch } = usePharmacistNotificationsListQuery(filters);
  const markOne = useMarkPharmacistNotificationReadMutation();
  const markAll = useMarkAllPharmacistNotificationsReadMutation();

  // Nurse Phase 2 by Atharva — client-side guard so Unread never shows already-read rows
  const items = useMemo(() => {
    let list = data?.items ?? [];
    if (readFilter === 'unread') {
      list = list.filter((n) => isPharmacistNotificationUnread(n));
    } else if (readFilter === 'read') {
      list = list.filter((n) => isPharmacistNotificationRead(n));
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

  // Nurse Phase 2 by Atharva — Clear filters for search + type + date range
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
    if (isPharmacistNotificationUnread(n)) {
      try {
        await markOne.mutateAsync(n.id);
      } catch {
        return;
      }
    }
    onDeepLink?.(n);
  };

  return (
    <div className="pharmacy-notif-page">
      <div className="pharmacy-notif-filters">
        {/* Nurse Phase 2 by Atharva — search first; live filter as user types */}
        <div className="pharmacy-notif-search">
          <Search size={16} className="pharmacy-notif-search__icon" aria-hidden />
          <input
            className="pharmacy-notif-search__input"
            type="search"
            placeholder="Search title, message, or sender…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search notifications"
          />
        </div>
        {/* Nurse Phase 2 by Atharva — order: All → Unread → Read → Mark all read → All types */}
        <div className="pharmacy-notif-filters__row">
          <div className="pharmacy-notif-filters__tabs">
            {[
              { id: 'all', label: 'All' },
              { id: 'unread', label: 'Unread' },
              { id: 'read', label: 'Read' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`pharmacy-notif-filter-tab${readFilter === tab.id ? ' is-active' : ''}`}
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
            className="pharmacy-notif-mark-all"
            onClick={handleMarkAll}
            disabled={markAll.isPending}
          >
            Mark all read
          </Button>
          <select
            className="pharmacy-notif-select"
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
          <label className="pharmacy-notif-date">
            <span className="pharmacy-notif-date__label">From</span>
            <input
              type="date"
              className="pharmacy-notif-date__input"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPage(1);
              }}
              aria-label="Start date"
            />
          </label>
          <label className="pharmacy-notif-date">
            <span className="pharmacy-notif-date__label">To</span>
            <input
              type="date"
              className="pharmacy-notif-date__input"
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
              className="pharmacy-notif-clear-filters"
              onClick={handleClearFilters}
              type="button"
            >
              <X size={12} aria-hidden />
              Clear filters
            </Button>
          ) : null}
        </div>
      </div>

      <div className="pharmacy-notif-card">
        <div className="pharmacy-notif-card__body">
          {isLoading ? (
            <p className="pharmacy-notif-muted">Loading notifications…</p>
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
              <PharmacyNotificationRow
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
        <div className="pharmacy-notif-pagination">
          <Button
            size="sm"
            variant="outline"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </Button>
          <span className="pharmacy-notif-muted">
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

/**
 * Nurse Phase 2 by Atharva —
 * Notifications inbox using GET /nurse/notifications + mark-read APIs.
 */

import { useEffect, useMemo, useState } from 'react';
import { Bell, Search, X } from 'lucide-react';
import {
  isLabTechnicianNotificationRead,
  isLabTechnicianNotificationUnread,
  useLabTechnicianNotificationsListQuery,
  useMarkAllLabTechnicianNotificationsReadMutation,
  useMarkLabTechnicianNotificationReadMutation,
} from '@/features/lab/hooks/useLabTechnicianNotificationsQuery';
import { Button, EmptyState } from '@/shared/components/common';
import { toast } from '@/shared/utils/toast';
import LabNotificationRow from './LabNotificationRow';
import './LabNotificationsBell.css';
import './LabNotificationsSection.css';

const TYPE_FILTERS = [
  { value: '', label: 'All types', kind: 'all' },
  { value: 'LAB_ORDER_CREATED', label: 'New order', kind: 'type' },
  { value: 'LAB_ORDER_CANCELLED', label: 'Cancelled', kind: 'type' },
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

export default function LabNotificationsSection({ onDeepLink }) {
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

  const { data, isLoading, isError, error, refetch } = useLabTechnicianNotificationsListQuery(filters);
  const markOne = useMarkLabTechnicianNotificationReadMutation();
  const markAll = useMarkAllLabTechnicianNotificationsReadMutation();

  // Nurse Phase 2 by Atharva — client-side guard so Unread never shows already-read rows
  const items = useMemo(() => {
    let list = data?.items ?? [];
    if (readFilter === 'unread') {
      list = list.filter((n) => isLabTechnicianNotificationUnread(n));
    } else if (readFilter === 'read') {
      list = list.filter((n) => isLabTechnicianNotificationRead(n));
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
    if (isLabTechnicianNotificationUnread(n)) {
      try {
        await markOne.mutateAsync(n.id);
      } catch {
        return;
      }
    }
    onDeepLink?.(n);
  };

  return (
    <div className="lab-notif-page">
      <div className="lab-notif-filters">
        {/* Nurse Phase 2 by Atharva — search first; live filter as user types */}
        <div className="lab-notif-search">
          <Search size={16} className="lab-notif-search__icon" aria-hidden />
          <input
            className="lab-notif-search__input"
            type="search"
            placeholder="Search title, message, or sender…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search notifications"
          />
        </div>
        {/* Nurse Phase 2 by Atharva — order: All → Unread → Read → Mark all read → All types */}
        <div className="lab-notif-filters__row">
          <div className="lab-notif-filters__tabs">
            {[
              { id: 'all', label: 'All' },
              { id: 'unread', label: 'Unread' },
              { id: 'read', label: 'Read' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`lab-notif-filter-tab${readFilter === tab.id ? ' is-active' : ''}`}
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
            className="lab-notif-mark-all"
            onClick={handleMarkAll}
            disabled={markAll.isPending}
          >
            Mark all read
          </Button>
          <select
            className="lab-notif-select"
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
          <label className="lab-notif-date">
            <span className="lab-notif-date__label">From</span>
            <input
              type="date"
              className="lab-notif-date__input"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPage(1);
              }}
              aria-label="Start date"
            />
          </label>
          <label className="lab-notif-date">
            <span className="lab-notif-date__label">To</span>
            <input
              type="date"
              className="lab-notif-date__input"
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
              className="lab-notif-clear-filters"
              onClick={handleClearFilters}
              type="button"
            >
              <X size={12} aria-hidden />
              Clear filters
            </Button>
          ) : null}
        </div>
      </div>

      <div className="lab-notif-card">
        <div className="lab-notif-card__body">
          {isLoading ? (
            <p className="lab-notif-muted">Loading notifications…</p>
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
              <LabNotificationRow
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
        <div className="lab-notif-pagination">
          <Button
            size="sm"
            variant="outline"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </Button>
          <span className="lab-notif-muted">
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

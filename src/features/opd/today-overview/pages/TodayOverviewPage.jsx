import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, ChevronRight, Printer, RefreshCw } from 'lucide-react';
import { Button, PageHeader } from '@/shared/components/common';
import { ROUTES } from '@/shared/constants';
import { DEFAULT_TODAY_FILTERS, useTodayOverview } from '../hooks/useTodayOverview';
import { formatClockTime, formatLongDate } from '../utils/todayOverviewUtils';
import TodayOverviewFilters from '../components/TodayOverviewFilters';
import OverviewStats from '../components/OverviewStats';
import ActivityPanel from '../components/ActivityPanel';
import PaymentSummarySection from '../components/sections/PaymentSummarySection';
import DoctorActivitySection from '../components/sections/DoctorActivitySection';
import TimelineSection from '../components/sections/TimelineSection';
import AlertsSection from '../components/sections/AlertsSection';
import './TodayOverviewPage.css';

export default function TodayOverviewPage() {
  const [filters, setFilters] = useState(DEFAULT_TODAY_FILTERS);
  const { stats, sections, filterOptions, lastUpdated, isFetching, refresh } =
    useTodayOverview(filters);

  return (
    <div className="today-overview page-stack">
      <PageHeader
        className="today-overview__header"
        breadcrumb={
          <span className="today-overview__breadcrumb">
            <Link to={ROUTES.DASHBOARD}>Dashboard</Link>
            <ChevronRight size={14} aria-hidden />
            <span>Today&apos;s Overview</span>
          </span>
        }
        title="Today's Overview"
        subtitle={
          <span className="today-overview__meta">
            <span className="today-overview__meta-item">
              <CalendarDays size={14} aria-hidden />
              {formatLongDate()}
            </span>
            <span className="today-overview__meta-dot" aria-hidden />
            <span
              className={`today-overview__meta-item ${
                isFetching ? 'today-overview__meta-item--live' : ''
              }`}
            >
              <span className="today-overview__pulse" aria-hidden />
              {isFetching
                ? 'Refreshing…'
                : `Updated ${lastUpdated ? formatClockTime(lastUpdated) : '—'}`}
            </span>
          </span>
        }
        actions={
          <div className="today-overview__header-actions no-print">
            <Button
              variant="outline"
              leftIcon={RefreshCw}
              loading={isFetching}
              onClick={refresh}
            >
              Refresh
            </Button>
            <Button variant="outline" leftIcon={Printer} onClick={() => window.print()}>
              Print
            </Button>
          </div>
        }
      />

      <TodayOverviewFilters filters={filters} onChange={setFilters} options={filterOptions} />

      <OverviewStats stats={stats} isLoading={sections.stats.isLoading} />

      <div className="today-overview__layout">
        <div className="today-overview__main">
          <ActivityPanel sections={sections} revenue={stats.billedToday} />
          <DoctorActivitySection section={sections.doctorActivity} />
        </div>

        <aside className="today-overview__rail">
          <AlertsSection section={sections.alerts} />
          <PaymentSummarySection section={sections.payments} />
          <TimelineSection section={sections.timeline} />
        </aside>
      </div>
    </div>
  );
}

import {
  Activity,
  CalendarDays,
  CheckCircle2,
  IndianRupee,
  Stethoscope,
  UserPlus,
} from 'lucide-react';
import { MoneyAmount } from '@/shared/components/common';
import OverviewSection from '../OverviewSection';
import { formatClockTime } from '../../utils/todayOverviewUtils';

const EVENT_ICONS = {
  registration: UserPlus,
  appointment: CalendarDays,
  visit: Stethoscope,
  payment: IndianRupee,
  completed: CheckCircle2,
};

const MAX_EVENTS = 40;

export default function TimelineSection({ section }) {
  const allRows = section.rows ?? [];
  const rows = allRows.slice(0, MAX_EVENTS);

  return (
    <OverviewSection
      title="Activity Timeline"
      icon={Activity}
      subtitle="Most recent front-desk activity first"
      action={
        allRows.length > MAX_EVENTS ? (
          <span className="today-overview__panel-note">
            Latest {MAX_EVENTS} of {allRows.length}
          </span>
        ) : null
      }
      isLoading={section.isLoading}
      isError={section.isError}
      error={section.error}
      isEmpty={rows.length === 0}
      emptyIcon={Activity}
      emptyTitle="No activity recorded yet today"
      emptyDescription="Registrations, appointments, visits and payments appear here as they happen."
      skeletonRows={4}
      className="today-overview__panel--timeline"
    >
      <ol className="today-overview__timeline">
        {rows.map((event) => {
          const Icon = EVENT_ICONS[event.type] ?? Activity;
          return (
            <li
              key={event.id}
              className={`today-overview__event today-overview__event--${event.type}`}
            >
              <span className="today-overview__event-time">{formatClockTime(event.at)}</span>
              <span className="today-overview__event-icon" aria-hidden>
                <Icon size={13} />
              </span>
              <div className="today-overview__event-body">
                <strong>{event.title}</strong>
                {event.detail ? <span>{event.detail}</span> : null}
              </div>
              {event.amount != null ? (
                <span className="today-overview__event-amount">
                  <MoneyAmount amount={event.amount} exact />
                </span>
              ) : null}
            </li>
          );
        })}
      </ol>
    </OverviewSection>
  );
}

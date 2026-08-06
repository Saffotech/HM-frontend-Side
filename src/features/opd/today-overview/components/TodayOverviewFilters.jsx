import { RotateCcw, SlidersHorizontal } from 'lucide-react';
import { Button, FilterBar, Select } from '@/shared/components/common';
import { TIME_OF_DAY } from '../utils/todayOverviewUtils';
import { DEFAULT_TODAY_FILTERS } from '../hooks/useTodayOverview';

const ALL_OPTION = { value: 'all', label: 'All' };

const PAYMENT_STATUS_OPTIONS = [
  { value: 'all', label: 'All Payments' },
  { value: 'Paid', label: 'Paid' },
  { value: 'Partial', label: 'Partial' },
  { value: 'Unpaid', label: 'Unpaid' },
];

const TIME_OPTIONS = [
  { value: 'all', label: 'All Day' },
  { value: TIME_OF_DAY.MORNING, label: 'Morning (before 12 PM)' },
  { value: TIME_OF_DAY.AFTERNOON, label: 'Afternoon (12–5 PM)' },
  { value: TIME_OF_DAY.EVENING, label: 'Evening (after 5 PM)' },
];

export default function TodayOverviewFilters({ filters, onChange, options }) {
  const setFilter = (key) => (value) => onChange({ ...filters, [key]: value || 'all' });
  const activeCount = Object.keys(DEFAULT_TODAY_FILTERS).filter(
    (key) => filters[key] !== DEFAULT_TODAY_FILTERS[key]
  ).length;

  return (
    <FilterBar
      className="today-overview__filters no-print"
      search={
        <div className="today-overview__filters-legend">
          <SlidersHorizontal size={16} aria-hidden />
          <span>Filters</span>
          {activeCount > 0 ? (
            <span className="today-overview__filters-count">{activeCount}</span>
          ) : null}
        </div>
      }
      actions={
        activeCount > 0 ? (
          <Button
            variant="outline"
            size="sm"
            leftIcon={RotateCcw}
            onClick={() => onChange(DEFAULT_TODAY_FILTERS)}
          >
            Reset
          </Button>
        ) : null
      }
    >
      <Select
        label="Doctor"
        value={filters.doctor}
        onChange={setFilter('doctor')}
        options={[{ ...ALL_OPTION, label: 'All Doctors' }, ...options.doctors]}
      />
      <Select
        label="Department"
        value={filters.department}
        onChange={setFilter('department')}
        options={[{ ...ALL_OPTION, label: 'All Departments' }, ...options.departments]}
      />
      <Select
        label="Payment Status"
        value={filters.paymentStatus}
        onChange={setFilter('paymentStatus')}
        options={PAYMENT_STATUS_OPTIONS}
      />
      <Select
        label="Visit Status"
        value={filters.status}
        onChange={setFilter('status')}
        options={[{ ...ALL_OPTION, label: 'All Statuses' }, ...options.statuses]}
      />
      <Select
        label="Time of Day"
        value={filters.timeOfDay}
        onChange={setFilter('timeOfDay')}
        options={TIME_OPTIONS}
      />
    </FilterBar>
  );
}

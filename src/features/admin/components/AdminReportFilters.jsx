import { DateInput } from '@/shared/components/common';
import AdminFilterPanel from '@/features/admin/components/AdminFilterPanel';

export default function AdminReportFilters({
  fromDate,
  toDate,
  onFromChange,
  onToChange,
  children,
  onReset,
  showReset = false,
}) {
  return (
    <AdminFilterPanel onReset={onReset} showReset={showReset}>
      <DateInput
        label="From"
        value={fromDate}
        onChange={(e) => onFromChange(e.target.value)}
        className="admin-report-filters__date"
      />
      <DateInput
        label="To"
        value={toDate}
        onChange={(e) => onToChange(e.target.value)}
        className="admin-report-filters__date"
      />
      {children}
    </AdminFilterPanel>
  );
}

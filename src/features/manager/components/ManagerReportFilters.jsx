import { DateInput } from '@/shared/components/common';
import ManagerFilterPanel from '@/features/manager/components/ManagerFilterPanel';

/* Legacy identifier preserved: AdminReportFilters. Active name: ManagerReportFilters. */
export default function ManagerReportFilters({
  fromDate,
  toDate,
  onFromChange,
  onToChange,
  children,
  onReset,
  showReset = false,
  /** Inline row without the Filters label / heavy panel chrome */
  inline = false,
}) {
  const fields = (
    <>
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
    </>
  );

  if (inline) {
    return <div className="admin-report-filters admin-report-filters--inline">{fields}</div>;
  }

  return (
    <ManagerFilterPanel onReset={onReset} showReset={showReset} hideLabel>
      {fields}
    </ManagerFilterPanel>
  );
}

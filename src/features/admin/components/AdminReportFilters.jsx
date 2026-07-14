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
    <AdminFilterPanel onReset={onReset} showReset={showReset} hideLabel>
      {fields}
    </AdminFilterPanel>
  );
}

import { useEffect, useMemo, useState } from 'react';
import { Beaker, Eye, Scan } from 'lucide-react';
import StatusPill from '@/features/doctor/components/StatusPill';
import { Button, TablePagination } from '@/shared/components/common';
import { inferTestCategory } from '@/shared/utils/doctorLabView';
import '../styles/doctor-patient-clinical.css';

const LABS_PAGE_SIZE = 5;

function CategoryCell({ category, testName, departmentName }) {
  const label = inferTestCategory(testName, category, departmentName);
  const isRad = label === 'Radiology';
  const Icon = isRad ? Scan : Beaker;
  return (
    <span className="doc-labs-category">
      <Icon size={14} aria-hidden />
      {label}
    </span>
  );
}

/**
 * Lab reports for patient history — tabular list with view action per row.
 */
export default function DoctorLabReportsSnapshot({ labs = [], onViewReport }) {
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [labs.length]);

  const pageCount = Math.max(1, Math.ceil(labs.length / LABS_PAGE_SIZE) || 1);
  const safePage = Math.min(page, pageCount);
  const pagedLabs = useMemo(
    () => labs.slice((safePage - 1) * LABS_PAGE_SIZE, safePage * LABS_PAGE_SIZE),
    [labs, safePage],
  );

  if (!labs.length) return null;

  return (
    <div className="doc-profile-labs-table-wrap">
      <div className="table-wrap">
        <table className="data-table doc-labs-table doc-profile-labs-table">
          <thead>
            <tr>
              <th>Test</th>
              <th>Category</th>
              <th>Ordered</th>
              <th>Priority</th>
              <th>Status</th>
              <th className="doc-labs-table__actions-head">Action</th>
            </tr>
          </thead>
          <tbody>
            {pagedLabs.map((test, index) => (
              <tr key={test.id ?? `${test.testName}-${index}`}>
                <td className="doc-profile-labs-table__test">{test.testName || '—'}</td>
                <td>
                  <CategoryCell
                    category={test.category}
                    testName={test.testName}
                    departmentName={test.departmentName}
                  />
                </td>
                <td>{test.orderedDisplay || '—'}</td>
                <td>{test.priority || '—'}</td>
                <td>
                  <StatusPill status={test.doctorStatus ?? test.status} />
                </td>
                <td className="doc-labs-table__actions">
                  <div className="doc-labs-table__actions-inner">
                    <Button
                      type="button"
                      size="sm"
                      className="doc-labs-view-btn"
                      onClick={() => onViewReport?.(test)}
                    >
                      <Eye size={14} aria-hidden />
                      View report
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {labs.length > LABS_PAGE_SIZE ? (
        <div className="doc-profile-labs-table__pagination">
          <TablePagination
            totalPages={pageCount}
            page={safePage}
            pageSize={LABS_PAGE_SIZE}
            totalItems={labs.length}
            onPageChange={setPage}
            itemLabel="lab reports"
          />
        </div>
      ) : null}
    </div>
  );
}

import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { receptionistApi } from '../api/receptionist';
import DepartmentDoctorFilter from '../components/DepartmentDoctorFilter';
import PaginationBar from '../components/PaginationBar';
import StatusBadge from '../components/StatusBadge';
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue';
import { PAGE_SIZE_LIST } from '../utils/params';
import { buildQueueHistoryDateParams } from '../utils/queueStatus';

export default function QueueHistoryPage() {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [search, setSearch] = useState('');
  const [deptId, setDeptId] = useState('all');
  const [docId, setDocId] = useState('all');
  const [paymentStatus, setPaymentStatus] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const debouncedSearch = useDebouncedValue(search, 400);

  const load = () => {
    setLoading(true);
    setError('');
    receptionistApi
      .getQueueHistory({
        search: debouncedSearch.trim() || undefined,
        doctor_id: docId !== 'all' ? Number(docId) : undefined,
        department_id: deptId !== 'all' ? Number(deptId) : undefined,
        status: 'completed',
        payment_status: paymentStatus !== 'all' ? paymentStatus : undefined,
        ...buildQueueHistoryDateParams(dateFrom, dateTo),
        page: currentPage,
        limit: PAGE_SIZE_LIST,
      })
      .then((data) => {
        setPatients(data.rows);
        setTotal(data.total);
        setTotalPages(data.totalPages);
      })
      .catch((err) => setError(err?.message || 'Failed to load history'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, deptId, docId, paymentStatus, dateFrom, dateTo, currentPage]);

  const getDoctorName = (p) => p.doctor_name || (p.doctor_id ? `Doctor #${p.doctor_id}` : '—');

  const getConsultationTime = (p) => {
    if (p.status === 'cancelled') return p.cancelled_at || '—';
    if (p.status === 'completed') return p.completed_at || p.called_at || '—';
    return p.scheduled_at || '—';
  };

  return (
    <div className="rec-card rec-queue-history">
        {error ? (
          <div className="rec-queue-history__alert" role="alert">
            <p>{error}</p>
            <button type="button" className="rec-btn" onClick={load}>
              Try again
            </button>
          </div>
        ) : null}

        <div className="rec-queue-history__filters">
          <div className="rec-queue-history__filter-row">
            <div className="rec-search rec-queue-history__search">
              <input
                type="text"
                placeholder="Search patient name, ID or UHID..."
                className="rec-input"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>

            <DepartmentDoctorFilter
              compact
              selectedDepartmentId={deptId}
              onDepartmentChange={(d) => {
                setDeptId(d);
                setDocId('all');
                setCurrentPage(1);
              }}
              selectedDoctorId={docId}
              onDoctorChange={(d) => {
                setDocId(d);
                setCurrentPage(1);
              }}
            />

            <div className="rec-queue-history__date-range">
              <input
                type="date"
                className="rec-input rec-input--plain rec-input--compact rec-queue-history__date"
                value={dateFrom}
                onChange={(e) => {
                  setDateFrom(e.target.value);
                  setCurrentPage(1);
                }}
                aria-label="From date"
                title="From date"
              />
              <span className="rec-queue-history__date-sep" aria-hidden>
                to
              </span>
              <input
                type="date"
                className="rec-input rec-input--plain rec-input--compact rec-queue-history__date"
                value={dateTo}
                onChange={(e) => {
                  setDateTo(e.target.value);
                  setCurrentPage(1);
                }}
                aria-label="To date"
                title="To date"
              />
            </div>

            <select
              className="rec-select rec-select--compact rec-queue-history__select"
              value={paymentStatus}
              onChange={(e) => {
                setPaymentStatus(e.target.value);
                setCurrentPage(1);
              }}
              aria-label="Payment status"
            >
              <option value="all">All Payments</option>
              <option value="paid">Paid</option>
              <option value="unpaid">Unpaid</option>
            </select>
          </div>
        </div>

        <div className="rec-table-wrap rec-queue-history__table">
          <table className="rec-table">
            <thead>
              <tr>
                <th className="rec-text-center" style={{ width: '4rem' }}>
                  #
                </th>
                <th>Date</th>
                <th>Patient ID</th>
                <th>Patient Name</th>
                <th>Doctor</th>
                <th>Department</th>
                <th>Status</th>
                <th>Consultation / Cancel Time</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="rec-table__empty">
                    Loading history...
                  </td>
                </tr>
              ) : patients.length === 0 ? (
                <tr>
                  <td colSpan={8} className="rec-table__empty">
                    <div className="rec-table__empty-icon">
                      <Search size={24} />
                    </div>
                    <p>No completed consultations found for the selected filters</p>
                  </td>
                </tr>
              ) : (
                patients.map((patient, index) => (
                  <tr key={patient.id}>
                    <td className="rec-text-center rec-text-muted">
                      {(currentPage - 1) * PAGE_SIZE_LIST + index + 1}
                    </td>
                    <td className="rec-font-medium">{patient.date}</td>
                    <td className="rec-font-semibold">{patient.patient_uid}</td>
                    <td className="rec-font-medium">{patient.name}</td>
                    <td>{getDoctorName(patient)}</td>
                    <td className="rec-text-muted">{patient.department ?? '—'}</td>
                    <td>
                      <StatusBadge status={patient.display_status ?? patient.status} />
                    </td>
                    <td className="rec-font-medium">{getConsultationTime(patient)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <PaginationBar
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          totalItems={total}
          itemsPerPage={PAGE_SIZE_LIST}
        />
      </div>
  );
}

import { useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { receptionistApi } from '../api/receptionist';
import DepartmentDoctorFilter from '../components/DepartmentDoctorFilter';
import PaginationBar from '../components/PaginationBar';
import StatusBadge from '../components/StatusBadge';
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue';
import { PAGE_SIZE_LIST } from '../utils/params';
import { buildTodayQueueFilterParams } from '../utils/queueStatus';

export default function TodayQueuePage() {
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [search, setSearch] = useState('');
  const [deptId, setDeptId] = useState('all');
  const [docId, setDocId] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const debouncedSearch = useDebouncedValue(search, 400);

  const doctorsById = useMemo(() => {
    const map = new Map();
    doctors.forEach((doctor) => map.set(doctor.id, doctor));
    return map;
  }, [doctors]);

  useEffect(() => {
    let cancelled = false;
    receptionistApi
      .getDoctors()
      .then((list) => {
        if (!cancelled) setDoctors(list);
      })
      .catch(() => {
        if (!cancelled) setDoctors([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const load = () => {
    setLoading(true);
    setError('');
    receptionistApi
      .getTodayQueue({
        search: debouncedSearch.trim() || undefined,
        doctor_id: docId !== 'all' ? Number(docId) : undefined,
        department_id: deptId !== 'all' ? Number(deptId) : undefined,
        page: currentPage,
        limit: PAGE_SIZE_LIST,
        ...buildTodayQueueFilterParams(statusFilter),
      })
      .then((data) => {
        setPatients(data.rows);
        setTotal(data.total);
        setTotalPages(data.totalPages);
      })
      .catch((err) => setError(err?.message || "Failed to load today's queue"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, deptId, docId, statusFilter, currentPage]);

  const getDoctorName = (p) => p.doctor_name || (p.doctor_id ? `Doctor #${p.doctor_id}` : '—');

  const getRoomNo = (p) => {
    const doctor = p.doctor_id != null ? doctorsById.get(p.doctor_id) : null;
    return doctor?.room_no ?? '—';
  };

  const colSpan = 9;

  return (
    <div className="rec-card">
        {error ? (
          <div style={{ padding: '1rem' }} role="alert">
            <p>{error}</p>
            <button type="button" className="rec-btn" onClick={load}>
              Try again
            </button>
          </div>
        ) : null}

        <div className="rec-filters">
          <div className="rec-filters__row">
            <div className="rec-search" style={{ maxWidth: '20rem' }}>
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

            <div className="rec-filter-group__field">
              <select
                className="rec-select"
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                aria-label="Status"
              >
                <option value="all">All</option>
                <option value="scheduled">Scheduled</option>
                <option value="pending">Pending</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>
        </div>

        <div className="rec-table-wrap">
          <table className="rec-table">
            <thead>
              <tr>
                <th className="rec-text-center" style={{ width: '4rem' }}>
                  #
                </th>
                <th>Patient ID</th>
                <th>Patient Name</th>
                <th>Phone Number</th>
                <th>Doctor</th>
                <th>Department</th>
                <th>Status</th>
                <th>Time</th>
                <th>Room Number</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={colSpan} className="rec-table__empty">
                    Loading queue...
                  </td>
                </tr>
              ) : patients.length === 0 ? (
                <tr>
                  <td colSpan={colSpan} className="rec-table__empty">
                    <div className="rec-table__empty-icon">
                      <Search size={24} />
                    </div>
                    <p>No patients in today&apos;s queue</p>
                  </td>
                </tr>
              ) : (
                patients.map((patient, index) => (
                  <tr key={patient.id}>
                    <td className="rec-text-center rec-text-muted">
                      {(currentPage - 1) * PAGE_SIZE_LIST + index + 1}
                    </td>
                    <td className="rec-font-semibold">{patient.patient_uid}</td>
                    <td className="rec-font-medium">{patient.name}</td>
                    <td className="rec-text-muted">{patient.phone}</td>
                    <td>{getDoctorName(patient)}</td>
                    <td className="rec-text-muted">{patient.department ?? '—'}</td>
                    <td>
                      <StatusBadge status={patient.display_status} />
                    </td>
                    <td className="rec-tabular">{patient.scheduled_at}</td>
                    <td className="rec-text-muted">{getRoomNo(patient)}</td>
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

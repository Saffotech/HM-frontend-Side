import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarCheck, CheckCircle2, XCircle, Clock, ArrowRight, Search } from 'lucide-react';
import { receptionistApi } from '../api/receptionist';
import DepartmentDoctorFilter from '../components/DepartmentDoctorFilter';
import StatusBadge from '../components/StatusBadge';
import PaginationBar from '../components/PaginationBar';
import { ROUTES } from '@/shared/constants';
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue';
import { PAGE_SIZE_LIST } from '../utils/params';
import { cn } from '../utils/cn';

function tableQueryFromStatusFilter(statusFilter) {
  if (statusFilter === 'scheduled') return { payment_status: 'paid' };
  if (statusFilter === 'completed') return { status: 'completed' };
  if (statusFilter === 'cancelled') return { __unsupported: true };
  return {};
}

export default function ReceptionistDashboardPage() {
  const [stats, setStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [patients, setPatients] = useState([]);
  const [tableTotal, setTableTotal] = useState(0);
  const [tablePage, setTablePage] = useState(1);
  const [tableTotalPages, setTableTotalPages] = useState(1);
  const [loadingTable, setLoadingTable] = useState(true);
  const [error, setError] = useState('');

  const [statusFilter, setStatusFilter] = useState('all');
  const [tableDept, setTableDept] = useState('all');
  const [tableDoc, setTableDoc] = useState('all');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 400);

  const doctorId = tableDoc !== 'all' ? Number(tableDoc) : undefined;
  const departmentId = tableDept !== 'all' ? Number(tableDept) : undefined;

  const loadStats = () => {
    setLoadingStats(true);
    receptionistApi
      .getDashboardStats(doctorId ? { doctor_id: doctorId } : {})
      .then((d) => setStats(d))
      .catch((err) => setError(err?.message || 'Failed to load dashboard'))
      .finally(() => setLoadingStats(false));
  };

  const loadTable = () => {
    const statusQuery = tableQueryFromStatusFilter(statusFilter);
    if (statusQuery.__unsupported) {
      setPatients([]);
      setTableTotal(0);
      setTableTotalPages(1);
      setLoadingTable(false);
      return;
    }

    setLoadingTable(true);
    receptionistApi
      .getTodayQueue({
        search: debouncedSearch.trim() || undefined,
        doctor_id: doctorId,
        department_id: departmentId,
        page: tablePage,
        limit: PAGE_SIZE_LIST,
        ...statusQuery,
      })
      .then((data) => {
        setPatients(data.rows);
        setTableTotal(data.total);
        setTableTotalPages(data.totalPages);
      })
      .catch((err) => setError(err?.message || 'Failed to load patients'))
      .finally(() => setLoadingTable(false));
  };

  useEffect(() => {
    loadStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doctorId]);

  useEffect(() => {
    loadTable();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, doctorId, departmentId, statusFilter, tablePage]);

  const doctorName = (patient) =>
    patient.doctor_name || (patient.doctor_id ? `Doctor #${patient.doctor_id}` : '—');

  const toggleStatus = (id) => {
    setStatusFilter((prev) => (prev === id ? 'all' : id));
    setTablePage(1);
  };

  const statCards = [
    {
      id: 'scheduled',
      label: 'Scheduled',
      value: stats?.scheduled ?? 0,
      icon: CalendarCheck,
      iconClass: 'rec-stat-card__icon--teal',
      activeClass: 'scheduled',
    },
    {
      id: 'completed',
      label: 'Completed',
      value: stats?.completed ?? 0,
      icon: CheckCircle2,
      iconClass: 'rec-stat-card__icon--green',
      activeClass: 'completed',
    },
    {
      id: 'cancelled',
      label: 'Cancelled',
      value: stats?.cancelled ?? 0,
      icon: XCircle,
      iconClass: 'rec-stat-card__icon--red',
      activeClass: 'cancelled',
    },
    {
      id: 'doctor_availability',
      label: 'Doctor Availability',
      value: null,
      icon: Clock,
      iconClass: 'rec-stat-card__icon--primary',
      href: ROUTES.RECEPTIONIST_DOCTOR_QUEUES,
    },
  ];

  const tableEmptyMessage = useMemo(() => {
    if (statusFilter === 'cancelled') {
      return 'Cancelled appointments are included in dashboard stats only.';
    }
    return 'No patients match the selected filters.';
  }, [statusFilter]);

  return (
    <>
      {error ? (
        <div className="rec-card" style={{ marginBottom: '1rem', padding: '1rem' }} role="alert">
          <p style={{ margin: 0 }}>{error}</p>
          <button
            type="button"
            className="rec-btn"
            style={{ marginTop: '0.75rem' }}
            onClick={() => {
              loadStats();
              loadTable();
            }}
          >
            Try again
          </button>
        </div>
      ) : null}

      <section className="rec-stat-grid">
        {statCards.map((card) => {
          const isActive = !card.href && statusFilter === card.id;
          const inner = (
            <div
              className={cn(
                'rec-stat-card',
                isActive && `rec-stat-card--active ${card.activeClass}`,
              )}
            >
              <div className={cn('rec-stat-card__icon', card.iconClass)}>
                <card.icon size={18} />
              </div>
              <div style={{ minWidth: 0 }}>
                {card.value !== null ? (
                  <div className="rec-stat-card__value">{loadingStats ? '—' : card.value}</div>
                ) : (
                  <div className="rec-stat-card__link-text">
                    View Slots
                    {card.href && <ArrowRight size={14} />}
                  </div>
                )}
                <div className="rec-stat-card__label">{card.label}</div>
              </div>
              {isActive && <span className="rec-stat-card__badge">ON</span>}
            </div>
          );

          if (card.href) {
            return (
              <Link key={card.id} to={card.href} style={{ textDecoration: 'none', color: 'inherit' }}>
                {inner}
              </Link>
            );
          }

          return (
            <div
              key={card.id}
              onClick={() => toggleStatus(card.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter') toggleStatus(card.id);
              }}
            >
              {inner}
            </div>
          );
        })}
      </section>

      <section className="rec-card">
        <div className="rec-filters">
          <div className="rec-filters__row">
            <div className="rec-filters__title-row">
              <h3 className="rec-filters__title">
                {statusFilter === 'all'
                  ? "Today's Patients"
                  : `${statusFilter.charAt(0).toUpperCase()}${statusFilter.slice(1)} Patients`}
              </h3>
              {statusFilter !== 'all' && (
                <button
                  type="button"
                  onClick={() => {
                    setStatusFilter('all');
                    setTablePage(1);
                  }}
                  className="rec-filters__clear"
                >
                  Clear
                </button>
              )}
            </div>
            <DepartmentDoctorFilter
              selectedDepartmentId={tableDept}
              onDepartmentChange={(d) => {
                setTableDept(d);
                setTableDoc('all');
                setTablePage(1);
              }}
              selectedDoctorId={tableDoc}
              onDoctorChange={(d) => {
                setTableDoc(d);
                setTablePage(1);
              }}
            />
          </div>

          <div className="rec-search">
            <Search className="rec-search__icon" size={16} />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setTablePage(1);
              }}
              placeholder="Search by patient ID, name, doctor or status…"
              className="rec-input"
            />
          </div>
        </div>

        <div className="rec-table-wrap">
          <table className="rec-table">
            <thead>
              <tr>
                <th>Patient ID</th>
                <th>Patient Name</th>
                <th>Doctor</th>
                <th>Department</th>
                <th>Time</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {loadingTable ? (
                <tr>
                  <td colSpan={6} className="rec-table__empty">
                    Loading patients…
                  </td>
                </tr>
              ) : patients.length === 0 ? (
                <tr>
                  <td colSpan={6} className="rec-table__empty">
                    {tableEmptyMessage}
                  </td>
                </tr>
              ) : (
                patients.map((patient, index) => (
                  <tr key={patient.appointment_id ?? `patient-${index}`}>
                    <td className="rec-font-semibold">{patient.patient_uid}</td>
                    <td className="rec-font-semibold">{patient.name}</td>
                    <td className="rec-text-muted">{doctorName(patient)}</td>
                    <td className="rec-text-muted">{patient.department ?? '—'}</td>
                    <td className="rec-text-muted rec-tabular">{patient.scheduled_at}</td>
                    <td>
                      <StatusBadge status={patient.display_status ?? patient.status} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <PaginationBar
          currentPage={tablePage}
          totalPages={tableTotalPages}
          onPageChange={setTablePage}
          totalItems={tableTotal}
          itemsPerPage={PAGE_SIZE_LIST}
        />
      </section>
    </>
  );
}

import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Stethoscope, ArrowLeft, ChevronDown, CalendarClock } from 'lucide-react';
import { receptionistApi } from '../api/receptionist';
import StatusBadge from '../components/StatusBadge';
import PaginationBar from '../components/PaginationBar';
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue';
import { formatDate } from '../utils/date';
import { PAGE_SIZE_LIST } from '../utils/params';
import { cn } from '../utils/cn';
import { TimeSlotGrid } from '@/shared/components/common';
import '@/shared/components/common/TimeSlotGrid.css';

export default function DoctorQueuesPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const doctorParam = searchParams.get('doctor') || '';

  const [doctors, setDoctors] = useState([]);
  const [doctorsLoading, setDoctorsLoading] = useState(true);
  const [filterDept, setFilterDept] = useState('all');
  const [filterDoctor, setFilterDoctor] = useState('all');
  const [search, setSearch] = useState('');
  const [slotFilter, setSlotFilter] = useState('all');

  const [patients, setPatients] = useState([]);
  const [timeSlots, setTimeSlots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [queueTotal, setQueueTotal] = useState(0);
  const [queuePage, setQueuePage] = useState(1);
  const [queueTotalPages, setQueueTotalPages] = useState(1);

  const [queueSearch, setQueueSearch] = useState('');
  const [queueStatus, setQueueStatus] = useState('all');
  const [queuePayment, setQueuePayment] = useState('all');
  const [queueDate, setQueueDate] = useState(() => formatDate(new Date()));
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const debouncedQueueSearch = useDebouncedValue(queueSearch, 400);

  const selectedDoctor = useMemo(
    () => (doctorParam ? doctors.find((d) => d.id === Number(doctorParam)) : null),
    [doctorParam, doctors],
  );

  useEffect(() => {
    let cancelled = false;
    setDoctorsLoading(true);
    receptionistApi
      .getDoctors()
      .then((list) => {
        if (!cancelled) setDoctors(list);
      })
      .catch((err) => {
        if (!cancelled) setError(err?.message || 'Failed to load doctors');
      })
      .finally(() => {
        if (!cancelled) setDoctorsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!doctorParam) {
      setPatients([]);
      setTimeSlots([]);
      return undefined;
    }

    let cancelled = false;
    setLoading(true);
    setError('');

    Promise.all([
      receptionistApi.getDoctorQueue(Number(doctorParam), {
        search: debouncedQueueSearch.trim() || undefined,
        status: queueStatus !== 'all' ? queueStatus : undefined,
        payment_status: queuePayment !== 'all' ? queuePayment : undefined,
        date: queueDate || undefined,
        page: queuePage,
        limit: PAGE_SIZE_LIST,
      }),
      receptionistApi.getDoctorTimeSlots(Number(doctorParam), { date: queueDate }),
    ])
      .then(([q, s]) => {
        if (cancelled) return;
        setPatients(q.rows);
        setQueueTotal(q.total);
        setQueueTotalPages(q.totalPages);
        setTimeSlots(s);
      })
      .catch((err) => {
        if (!cancelled) setError(err?.message || 'Failed to load doctor queue');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [doctorParam, debouncedQueueSearch, queueStatus, queuePayment, queueDate, queuePage]);

  useEffect(() => {
    setScheduleOpen(false);
    setSlotFilter('all');
  }, [doctorParam]);

  const departments = useMemo(() => {
    const byId = new Map();
    doctors.forEach((doctor) => {
      if (doctor.department_id != null && doctor.department) {
        byId.set(String(doctor.department_id), {
          id: doctor.department_id,
          name: doctor.department,
        });
      } else if (doctor.department) {
        // Fallback when API returns name without id
        const key = `name:${doctor.department}`;
        if (!byId.has(key)) {
          byId.set(key, { id: key, name: doctor.department });
        }
      }
    });
    return Array.from(byId.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [doctors]);

  const dropdownDoctors = useMemo(
    () =>
      filterDept === 'all'
        ? doctors
        : doctors.filter((d) => {
            if (String(filterDept).startsWith('name:')) {
              return d.department === filterDept.slice(5);
            }
            return String(d.department_id) === String(filterDept);
          }),
    [filterDept, doctors],
  );

  const tableDoctors = useMemo(() => {
    const query = search.trim().toLowerCase();
    let list = doctors;

    if (filterDept !== 'all') {
      list = list.filter((d) => {
        if (String(filterDept).startsWith('name:')) {
          return d.department === filterDept.slice(5);
        }
        return String(d.department_id) === String(filterDept);
      });
    }
    if (filterDoctor !== 'all') {
      list = list.filter((d) => d.id === Number(filterDoctor));
    }
    if (query) {
      list = list.filter(
        (d) =>
          String(d.name || '')
            .toLowerCase()
            .includes(query) ||
          String(d.department || '')
            .toLowerCase()
            .includes(query) ||
          String(d.room_no || '')
            .toLowerCase()
            .includes(query),
      );
    }
    return list;
  }, [filterDept, filterDoctor, search, doctors]);

  const filteredSlots = useMemo(() => {
    const slots = timeSlots.map((slot) => ({
      time: slot.time,
      available: slot.available ?? slot.isFree ?? false,
    }));
    if (slotFilter === 'free') return slots.filter((s) => s.available);
    if (slotFilter === 'busy') return slots.filter((s) => !s.available);
    return slots;
  }, [timeSlots, slotFilter]);

  const slotStats = useMemo(() => {
    let free = 0;
    let busy = 0;
    for (const slot of timeSlots) {
      const available = slot.available ?? slot.isFree ?? false;
      if (available) free += 1;
      else busy += 1;
    }
    return { free, busy, total: timeSlots.length };
  }, [timeSlots]);

  const scheduleDate = useMemo(() => {
    if (!queueDate) return null;
    const [y, m, d] = queueDate.split('-').map(Number);
    return new Date(y, m - 1, d);
  }, [queueDate]);

  const openDoctorQueue = (id) => {
    setSlotFilter('all');
    setQueuePage(1);
    navigate(`?doctor=${id}`);
  };

  const backToList = () => navigate('.');

  if (doctorParam) {
    const doctorLabel =
      selectedDoctor?.name || patients[0]?.doctor_name || `Doctor #${doctorParam}`;
    const doctorDept = selectedDoctor?.department || patients[0]?.department || '—';
    const doctorRoom = selectedDoctor?.room_no ?? '—';

    return (
      <section className="rec-card rec-doctor-detail">
          <div className="rec-doctor-detail__header">
            <button type="button" onClick={backToList} className="rec-doctor-detail__back">
              <ArrowLeft size={16} />
              Back to All Doctors
            </button>

            <div className="rec-doctor-head">
              <div className="rec-doctor-head__info">
                <div className="rec-doctor-head__avatar rec-doctor-detail__avatar">
                  <Stethoscope size={18} />
                </div>
                <div>
                  <p className="rec-doctor-head__name">{doctorLabel}</p>
                  <p className="rec-doctor-head__meta">
                    <span className="rec-doctor-detail__dept">{doctorDept}</span>
                    <span className="rec-doctor-detail__meta-sep">·</span>
                    <span>Room {doctorRoom}</span>
                  </p>
                </div>
              </div>
            </div>
          </div>

          {error ? (
            <div className="rec-doctor-detail__alert" role="alert">
              <p>{error}</p>
            </div>
          ) : null}

          <div className="rec-doctor-detail__schedule-wrap">
            <button
              type="button"
              className={cn(
                'rec-doctor-detail__schedule-trigger',
                scheduleOpen && 'rec-doctor-detail__schedule-trigger--open',
              )}
              onClick={() => setScheduleOpen((open) => !open)}
              aria-expanded={scheduleOpen}
              aria-controls="doctor-schedule-panel"
            >
              <span className="rec-doctor-detail__schedule-trigger-main">
                <CalendarClock size={18} className="rec-doctor-detail__schedule-icon" aria-hidden />
                <span className="rec-doctor-detail__schedule-title">Today&apos;s Schedule</span>
                {!loading && slotStats.total > 0 ? (
                  <span className="rec-doctor-detail__schedule-badges">
                    <span className="rec-doctor-detail__badge rec-doctor-detail__badge--free">
                      {slotStats.free} free
                    </span>
                    <span className="rec-doctor-detail__badge rec-doctor-detail__badge--busy">
                      {slotStats.busy} busy
                    </span>
                  </span>
                ) : null}
              </span>
              <ChevronDown
                size={20}
                className={cn(
                  'rec-doctor-detail__schedule-chevron',
                  scheduleOpen && 'rec-doctor-detail__schedule-chevron--open',
                )}
                aria-hidden
              />
            </button>

            {scheduleOpen ? (
              <div
                id="doctor-schedule-panel"
                className="rec-doctor-detail__schedule-panel rec-schedule-slots"
              >
                <div className="rec-doctor-detail__schedule-toolbar">
                  <div className="rec-toggle-group rec-doctor-detail__slot-toggle">
                    {['all', 'free', 'busy'].map((f) => (
                      <button
                        key={f}
                        type="button"
                        onClick={() => setSlotFilter(f)}
                        className={cn(
                          'rec-toggle-group__btn',
                          slotFilter === f && 'rec-toggle-group__btn--active',
                          slotFilter === f && f === 'free' && 'rec-toggle-group__btn--active-free',
                          slotFilter === f && f === 'busy' && 'rec-toggle-group__btn--active-busy',
                        )}
                      >
                        {f === 'all' ? 'All Slots' : f === 'free' ? 'Free' : 'Busy'}
                      </button>
                    ))}
                  </div>
                </div>
                <TimeSlotGrid
                  className="time-slot-grid--compact"
                  date={scheduleDate}
                  doctorId={Number(doctorParam)}
                  apiSlots={filteredSlots}
                  useApiSlots
                  slotsLoading={loading}
                />
              </div>
            ) : null}
          </div>

          <div className="rec-doctor-detail__filters">
            <div className="rec-doctor-detail__filter-row">
              <div className="rec-search rec-doctor-detail__search">
                <input
                  type="text"
                  placeholder="Search patient name, ID or UHID..."
                  className="rec-input"
                  value={queueSearch}
                  onChange={(e) => {
                    setQueueSearch(e.target.value);
                    setQueuePage(1);
                  }}
                />
              </div>
              <input
                type="date"
                className="rec-input rec-input--plain rec-doctor-detail__date"
                value={queueDate}
                onChange={(e) => {
                  setQueueDate(e.target.value);
                  setQueuePage(1);
                }}
                aria-label="Queue date"
              />
              <select
                className="rec-select rec-select--compact rec-doctor-detail__filter-select"
                value={queueStatus}
                onChange={(e) => {
                  setQueueStatus(e.target.value);
                  setQueuePage(1);
                }}
                aria-label="Status"
              >
                <option value="all">All Statuses</option>
                <option value="scheduled">Scheduled</option>
                <option value="completed">Completed</option>
              </select>
              <select
                className="rec-select rec-select--compact rec-doctor-detail__filter-select"
                value={queuePayment}
                onChange={(e) => {
                  setQueuePayment(e.target.value);
                  setQueuePage(1);
                }}
                aria-label="Payment status"
              >
                <option value="all">All Payments</option>
                <option value="paid">Paid</option>
                <option value="unpaid">Unpaid</option>
              </select>
            </div>
          </div>

          <div className="rec-table-wrap rec-doctor-detail__table">
            <p className="rec-section-label rec-section-label--padded">Today&apos;s Queue</p>
            <table className="rec-table">
              <thead>
                <tr>
                  <th className="rec-text-center" style={{ width: '2.5rem' }}>
                    #
                  </th>
                  <th>Patient ID</th>
                  <th>Patient Name</th>
                  <th>Department</th>
                  <th>Status</th>
                  <th>Appointment Time</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="rec-table__empty">
                      Loading queue…
                    </td>
                  </tr>
                ) : patients.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="rec-table__empty">
                      No patients in queue for {doctorLabel} today.
                    </td>
                  </tr>
                ) : (
                  patients.map((p, idx) => (
                    <tr key={p.id}>
                      <td className="rec-text-center rec-text-muted rec-tabular">
                        {(queuePage - 1) * PAGE_SIZE_LIST + idx + 1}
                      </td>
                      <td className="rec-font-semibold">{p.patient_uid}</td>
                      <td className="rec-font-medium">{p.name}</td>
                      <td className="rec-text-muted">{p.department ?? '—'}</td>
                      <td>
                        <StatusBadge status={p.display_status ?? p.status} />
                      </td>
                      <td className="rec-font-medium rec-tabular">{p.scheduled_at}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <PaginationBar
            currentPage={queuePage}
            totalPages={queueTotalPages}
            onPageChange={setQueuePage}
            totalItems={queueTotal}
            itemsPerPage={PAGE_SIZE_LIST}
          />
        </section>
    );
  }

  return (
    <section className="rec-card rec-doctor-list">
        {error ? (
          <div style={{ padding: '1rem' }} role="alert">
            <p>{error}</p>
          </div>
        ) : null}

        <div className="rec-doctor-list__header">
          <div className="rec-filters__title-row">
            <span className="rec-doctor-list__title-icon">
              <Stethoscope size={18} />
            </span>
            <h2 className="rec-filters__title">All Doctors</h2>
            <span className="rec-doctor-list__count">{tableDoctors.length}</span>
          </div>

          <div className="rec-filter-group rec-doctor-list__filters">
            <div className="rec-filter-group__field rec-search">
              <input
                type="text"
                placeholder="Search doctor name, department or room..."
                className="rec-input"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="rec-filter-group__field">
              <select
                className="rec-select"
                value={filterDept}
                onChange={(e) => {
                  setFilterDept(e.target.value);
                  setFilterDoctor('all');
                }}
              >
                <option value="all">All Departments</option>
                {departments.map((d) => (
                  <option key={d.id} value={String(d.id)}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="rec-filter-group__field">
              <select
                className="rec-select"
                value={filterDoctor}
                onChange={(e) => setFilterDoctor(e.target.value)}
              >
                <option value="all">All Doctors</option>
                {dropdownDoctors.map((d) => (
                  <option key={d.id} value={String(d.id)}>
                    {d.name}
                  </option>
                ))}
                {dropdownDoctors.length === 0 && (
                  <option value="__none" disabled>
                    No doctors found
                  </option>
                )}
              </select>
            </div>
          </div>
        </div>

        <div className="rec-table-wrap rec-doctor-list__table">
          <table className="rec-table">
            <thead>
              <tr>
                <th style={{ width: '2.5rem' }}>#</th>
                <th>Doctor Name</th>
                <th>Department</th>
                <th>Room No.</th>
                <th style={{ textAlign: 'right' }}>View Queue</th>
              </tr>
            </thead>
            <tbody>
              {doctorsLoading ? (
                <tr>
                  <td colSpan={5} className="rec-table__empty">
                    Loading doctors…
                  </td>
                </tr>
              ) : tableDoctors.length === 0 ? (
                <tr>
                  <td colSpan={5} className="rec-table__empty">
                    No doctors found for today&apos;s schedule.
                  </td>
                </tr>
              ) : (
                tableDoctors.map((doc, idx) => {
                  const initial = (doc.name || '?')
                    .replace(/^Dr\.\s*/i, '')
                    .trim()
                    .split(/\s+/)
                    .map((p) => p[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase();

                  return (
                    <tr key={doc.id} className="rec-doctor-list__row">
                      <td className="rec-text-muted rec-tabular">{idx + 1}</td>
                      <td>
                        <div className="rec-doctor-list__name-cell">
                          <span
                            className={cn(
                              'rec-doctor-list__avatar',
                              idx % 2 === 1 && 'rec-doctor-list__avatar--alt',
                            )}
                            aria-hidden
                          >
                            {initial || '?'}
                          </span>
                          <span className="rec-font-medium">{doc.name}</span>
                        </div>
                      </td>
                      <td>
                        <span className="rec-dept-pill">{doc.department ?? '—'}</span>
                      </td>
                      <td className="rec-doctor-list__room">{doc.room_no ?? '—'}</td>
                      <td className="rec-doctor-list__actions">
                        <button
                          type="button"
                          className="rec-view-queue-btn"
                          onClick={() => openDoctorQueue(doc.id)}
                        >
                          View Queue
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
  );
}

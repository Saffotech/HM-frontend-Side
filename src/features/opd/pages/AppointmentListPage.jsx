import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Calendar } from 'lucide-react';
import {
  useAppointmentsQuery,
  useUpdateAppointmentMutation,
  useCancelAppointmentMutation,
  useDoctorSlotsQuery,
} from '@/shared/hooks/queries/useAppointmentQuery';
import { useBillsQuery } from '@/shared/hooks/queries/useBillingQuery';
import { asAppointmentList, asBillList } from '@/shared/hooks/queries/listDataUtils';
import { getLocalDayRangeIso } from '@/shared/utils/opdDates';
import {
  enrichAppointmentsWithPayment,
  isAppointmentPending,
  isPaidActiveAppointment,
  isVisibleOnOpdAppointmentsPage,
  matchesAppointmentStatusFilter,
  resolveAppointmentPayment,
  showsAppointmentPaymentActions,
} from '@/features/opd/utils/appointmentPaymentUtils';
import { useDepartmentsQuery, useDoctorsByDepartmentQuery } from '@/shared/hooks/queries/useOpdReferenceQuery';
import { usePagination } from '@/shared/hooks/usePagination';
import { useTableSort } from '@/shared/hooks/useTableSort';
import {
  Button,
  Input,
  StatusBadge,
  Modal,
  Textarea,
  TimeSlotGrid,
  Label,
  SearchBar,
  DataTableShell,
  QueryFeedback,
  ConfirmDialog,
  EmptyState,
} from '@/shared/components/common';
import { toast } from '@/shared/utils/toast';
import { ROUTES } from '@/shared/constants';
import CollectPaymentModal from '@/features/opd/billing/components/CollectPaymentModal';
import './AppointmentListPage.css';

const STATUS_PILLS = [
  { key: 'All', label: 'All', className: 'appointments-pill--all' },
  { key: 'Scheduled', label: 'Scheduled', className: 'appointments-pill--scheduled' },
  { key: 'Pending', label: 'Pending', className: 'appointments-pill--pending' },
  { key: 'Completed', label: 'Completed', className: 'appointments-pill--completed' },
  { key: 'Cancelled', label: 'Cancelled', className: 'appointments-pill--cancelled' },
];

export default function AppointmentListPage() {
  const navigate = useNavigate();
  const [apiDateFrom, setApiDateFrom] = useState(undefined);
  const [apiDateTo, setApiDateTo] = useState(undefined);
  const [search, setSearch] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [dateInputActive, setDateInputActive] = useState(false);
  const [filterDept, setFilterDept] = useState('All');
  const [filterDoc, setFilterDoc] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');

  const { data, isLoading, isError, error } = useAppointmentsQuery({
    fetchAll: true,
    date_from: apiDateFrom,
    date_to: apiDateTo,
  });
  const { data: billsData } = useBillsQuery({ fetchAll: true });
  const bills = asBillList(billsData);
  const appointments = useMemo(
    () => enrichAppointmentsWithPayment(asAppointmentList(data), bills),
    [data, bills],
  );
  const visibleAppointments = useMemo(
    () => appointments.filter(isVisibleOnOpdAppointmentsPage),
    [appointments],
  );
  const { data: departments = [] } = useDepartmentsQuery();
  const { data: deptDoctors = [] } = useDoctorsByDepartmentQuery(
    filterDept !== 'All' ? filterDept : undefined,
  );
  const updateAppointment = useUpdateAppointmentMutation();
  const cancelAppointment = useCancelAppointmentMutation();
  const [selectedAppt, setSelectedAppt] = useState(null);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedBillId, setSelectedBillId] = useState();
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');
  const [rescheduleErrors, setRescheduleErrors] = useState({});
  const {
    data: rescheduleSlots = [],
    isLoading: rescheduleSlotsLoading,
    isError: rescheduleSlotsError,
  } = useDoctorSlotsQuery({
    doctorId: selectedAppt?.doctorId,
    departmentId: selectedAppt?.deptId,
    date: newDate,
    enabled:
      rescheduleOpen &&
      Boolean(newDate && selectedAppt?.doctorId && selectedAppt?.deptId),
  });

  const doctors = useMemo(() => {
    if (filterDept === 'All') return [];
    return deptDoctors.map((d) => ({
      id: d.id,
      name: (d.name ?? '').replace(/^Dr\.\s*/i, '').trim() || String(d.id),
    }));
  }, [filterDept, deptDoctors]);

  useEffect(() => {
    if (filterDate) {
      const range = getLocalDayRangeIso(new Date(filterDate));
      setApiDateFrom(range.dateFrom);
      setApiDateTo(range.dateTo);
    } else {
      setApiDateFrom(undefined);
      setApiDateTo(undefined);
    }
  }, [filterDate]);

  const formatFilterDate = (d) =>
    d
      ? new Date(d).toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        })
      : '';

  const toolbarFiltered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return visibleAppointments.filter((a) => {
      const searchOk =
        !q ||
        a.patientName?.toLowerCase().includes(q) ||
        a.id?.toLowerCase().includes(q) ||
        (a.patientUid ?? a.patientId)?.toLowerCase?.().includes(q) ||
        a.doctorName?.toLowerCase().includes(q);
      if (!searchOk) return false;
      if (filterDept !== 'All' && String(a.deptId) !== String(filterDept)) return false;
      if (filterDoc !== 'All' && String(a.doctorId) !== String(filterDoc)) return false;
      if (filterDate) {
        const picked = formatFilterDate(filterDate);
        if (picked && a.date !== picked) return false;
      }
      return true;
    });
  }, [visibleAppointments, search, filterDept, filterDoc, filterDate]);

  const filtered = useMemo(
    () =>
      toolbarFiltered.filter((a) =>
        matchesAppointmentStatusFilter(a, filterStatus, a.payment),
      ),
    [toolbarFiltered, filterStatus],
  );

  const { sorted, sortKey, sortDir, toggleSort } = useTableSort(filtered, 'date', 'desc');
  const { paginatedItems, page, totalPages, goToPage, resetPage, totalItems, pageSize } =
    usePagination(sorted, 10);

  useEffect(() => {
    resetPage();
  }, [search, filterDate, filterDept, filterDoc, filterStatus, resetPage]);

  const statusCounts = useMemo(
    () =>
      STATUS_PILLS.reduce((acc, pill) => {
        acc[pill.key] = toolbarFiltered.filter((a) =>
          matchesAppointmentStatusFilter(a, pill.key, a.payment),
        ).length;
        return acc;
      }, {}),
    [toolbarFiltered],
  );

  const showPaymentActions = showsAppointmentPaymentActions(filterStatus);

  const openCollectPayment = (appt) => {
    const payment = appt.payment ?? resolveAppointmentPayment(appt, bills);
    if (payment.bill?.id) {
      setSelectedBillId(payment.bill.id);
      setPaymentModalOpen(true);
      return;
    }
    const patientRef = appt.patientUid ?? appt.patientDbId;
    if (patientRef) {
      navigate(`${ROUTES.BILLING_OPD_NEW}?patient=${encodeURIComponent(patientRef)}`);
      toast.info('Create a bill for this patient to collect payment');
      return;
    }
    toast.error('No bill found for this appointment');
  };

  const handleReschedule = () => {
    const errs = {};
    const todayIso = new Date().toISOString().split('T')[0];
    if (!newDate) errs.newDate = 'Date is required';
    else if (newDate < todayIso) errs.newDate = 'Date cannot be in the past';
    if (!newTime) errs.newTime = 'Time slot is required';
    setRescheduleErrors(errs);
    if (Object.keys(errs).length) return;
    updateAppointment.mutate({
      id: selectedAppt.dbId ?? selectedAppt.id,
      data: { date: formatFilterDate(newDate), time: newTime },
    });
    toast.success('Appointment rescheduled');
    setRescheduleOpen(false);
    setRescheduleErrors({});
  };

  const handleCancel = () => {
    cancelAppointment.mutate(selectedAppt.dbId ?? selectedAppt.id, {
      onSuccess: () => {
        toast.success('Appointment cancelled');
        setCancelOpen(false);
        setSelectedAppt(null);
      },
    });
  };

  const SortTh = ({ label, field }) => (
    <th
      className={`sortable ${sortKey === field ? 'sorted' : ''}`}
      onClick={() => toggleSort(field)}
    >
      {label}
      <span className="sort-icon">{sortKey === field ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}</span>
    </th>
  );

  return (
    <QueryFeedback isLoading={isLoading} isError={isError} error={error}>
    <div className="page-stack appointments-page">
      <div className="page-header appointments-page__header">
        <div className="appointments-page__title-wrap">
          <h2 className="page-title">Appointments</h2>
          {visibleAppointments.length > 0 && (
            <div className="appointments-page__summary-pills" aria-label="Appointment status summary">
              {STATUS_PILLS.map((pill) => (
                <button
                  key={pill.key}
                  type="button"
                  className={`appointments-pill ${pill.className} ${
                    filterStatus === pill.key ? 'appointments-pill--active' : ''
                  }`}
                  onClick={() => setFilterStatus(pill.key)}
                >
                  {statusCounts[pill.key] ?? 0} {pill.label}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="page-header__actions appointments-page__header-actions">
          <Link to={ROUTES.APPOINTMENTS_AVAILABILITY} className="profile-link-btn">
            <Button variant="outline">Check Availability</Button>
          </Link>
          <Link to={ROUTES.APPOINTMENTS_BOOK} className="profile-link-btn">
            <Button>+ Book Appointment</Button>
          </Link>
        </div>
      </div>

      <div className="card appointments-page__card">
        {visibleAppointments.length === 0 ? (
          <EmptyState
            icon={Calendar}
            title="No appointments"
            description="No appointments scheduled for this period"
          />
        ) : (
        <>
        <div className="page-toolbar appointment-toolbar">
          <SearchBar value={search} onChange={setSearch} placeholder="Search patient, ID, doctor..." />
          <div className="field appointment-date-filter">
            <label className="field__label" htmlFor="appointments-date-filter">
              Date
            </label>
            <input
              id="appointments-date-filter"
              className={`field__input appointment-date-filter__input ${
                filterDate ? 'appointment-date-filter__input--has-value' : ''
              }`}
              type={dateInputActive || filterDate ? 'date' : 'text'}
              placeholder="Select date"
              value={filterDate}
              onFocus={() => setDateInputActive(true)}
              onBlur={() => {
                if (!filterDate) setDateInputActive(false);
              }}
              onChange={(e) => setFilterDate(e.target.value)}
            />
          </div>
          <div className="field appointment-toolbar__filter">
            <label className="field__label" htmlFor="appointments-dept-filter">
              Department
            </label>
            <select
              id="appointments-dept-filter"
              className="field__input"
              value={filterDept}
              onChange={(e) => {
                setFilterDept(e.target.value);
                setFilterDoc('All');
              }}
            >
              <option value="All">All</option>
              {departments.map((d) => (
                <option key={d.id} value={String(d.id)}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field appointment-toolbar__filter">
            <label className="field__label" htmlFor="appointments-doctor-filter">
              Doctor
            </label>
            <select
              id="appointments-doctor-filter"
              className="field__input"
              value={filterDoc}
              disabled={filterDept === 'All'}
              onChange={(e) => setFilterDoc(e.target.value)}
            >
              <option value="All">All</option>
              {doctors.map((d) => (
                <option key={d.id} value={String(d.id)}>
                  Dr. {d.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <DataTableShell
          maxHeight="420px"
          pagination={{
            page,
            totalPages,
            totalItems,
            pageSize,
            onPageChange: goToPage,
          }}
        >
          <table className="data-table appointment-table">
            <thead>
              <tr>
                <SortTh label="Patient" field="patientName" />
                <th className="col-optional">Doctor / Dept</th>
                <SortTh label="Schedule" field="date" />
                <th>Status</th>
                {showPaymentActions && <th>Payment</th>}
                {showPaymentActions && <th className="actions-col">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {paginatedItems.map((appt) => (
                <tr
                  key={appt.id}
                  style={{ cursor: 'pointer' }}
                  onClick={() => {
                    const uid = appt.patientUid ?? appt.patientId;
                    if (uid) navigate(`/patients/${uid}/profile`);
                  }}
                >
                  <td>
                    <strong>{appt.patientName}</strong>
                    {(appt.patientUid ?? appt.patientId) && (
                      <div className="text-muted">{appt.patientUid ?? appt.patientId}</div>
                    )}
                    <div className="appt-cell__meta-mobile">
                      <span className="text-teal">{appt.doctorName}</span>
                      <span className="text-muted">{appt.deptName}</span>
                    </div>
                  </td>
                  <td className="col-optional">
                    <span className="text-teal">{appt.doctorName}</span>
                    <div className="text-muted">{appt.deptName}</div>
                  </td>
                  <td>
                    {appt.date}
                    <span className="time-pill">
                      {appt.time}
                    </span>
                  </td>
                  <td>
                    <StatusBadge status={appt.displayStatus ?? appt.status} />
                  </td>
                  {showPaymentActions && (
                    <td>
                      <StatusBadge status={appt.payment?.label ?? 'Unpaid'} />
                    </td>
                  )}
                  {showPaymentActions && (
                  <td className="actions-cell actions-cell--center appointments-table__actions" onClick={(e) => e.stopPropagation()}>
                    {isAppointmentPending(appt, appt.payment) && (
                      <Button
                        size="sm"
                        variant="success"
                        onClick={() => openCollectPayment(appt)}
                      >
                        Collect Payment
                      </Button>
                    )}
                    {isPaidActiveAppointment(appt, appt.payment) && (
                      <>
                        <Button
                          size="sm"
                          variant="warning"
                          onClick={() => {
                            setSelectedAppt(appt);
                            setRescheduleOpen(true);
                            setNewDate('');
                            setNewTime('');
                          }}
                        >
                          <Calendar size={14} /> Reschedule
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => {
                            setSelectedAppt(appt);
                            setCancelOpen(true);
                          }}
                        >
                          Cancel
                        </Button>
                      </>
                    )}
                  </td>
                  )}
                </tr>
              ))}
              {!paginatedItems.length && (
                <tr>
                  <td colSpan={showPaymentActions ? 6 : 4} className="empty-row">No appointments found</td>
                </tr>
              )}
            </tbody>
          </table>
        </DataTableShell>
        </>
        )}
      </div>

      <Modal
        isOpen={rescheduleOpen}
        onClose={() => setRescheduleOpen(false)}
        title="Reschedule"
        footer={
          <>
            <Button variant="outline" onClick={() => setRescheduleOpen(false)}>Close</Button>
            <Button onClick={handleReschedule} disabled={updateAppointment.isPending}>
              {updateAppointment.isPending ? 'Saving...' : 'Confirm'}
            </Button>
          </>
        }
      >
        <Input
          type="date"
          label="New Date"
          value={newDate}
          onChange={(e) => {
            setNewDate(e.target.value);
            if (rescheduleErrors.newDate) setRescheduleErrors((prev) => ({ ...prev, newDate: undefined }));
          }}
          error={rescheduleErrors.newDate}
          min={new Date().toISOString().split('T')[0]}
        />
        {newDate && (
          <>
            <Label>Select Time</Label>
            <TimeSlotGrid
              date={new Date(newDate)}
              doctorId={selectedAppt?.doctorId}
              departmentId={selectedAppt?.deptId}
              selectedTime={newTime}
              onSelectTime={(t) => {
                setNewTime(t);
                if (rescheduleErrors.newTime) setRescheduleErrors((prev) => ({ ...prev, newTime: undefined }));
              }}
              apiSlots={rescheduleSlots}
              useApiSlots
              slotsLoading={rescheduleSlotsLoading}
              slotsError={rescheduleSlotsError}
            />
            {rescheduleErrors.newTime && <p className="field__error">{rescheduleErrors.newTime}</p>}
          </>
        )}
        <Textarea label="Notes" placeholder="Optional" />
      </Modal>

      <ConfirmDialog
        isOpen={cancelOpen}
        message={`Cancel appointment for ${selectedAppt?.patientName}?`}
        onCancel={() => setCancelOpen(false)}
        onConfirm={handleCancel}
      />

      <CollectPaymentModal
        open={paymentModalOpen}
        onClose={() => {
          setPaymentModalOpen(false);
          setSelectedBillId(undefined);
        }}
        defaultBillId={selectedBillId}
      />
    </div>
    </QueryFeedback>
  );
}

import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Calendar } from 'lucide-react';
import {
  useAppointmentsQuery,
  useUpdateAppointmentMutation,
  useCancelAppointmentMutation,
  useDoctorSlotsQuery,
} from '@/shared/hooks/queries/useAppointmentQuery';
import { asAppointmentList, asAppointmentPageMeta } from '@/shared/hooks/queries/listDataUtils';
import {
  enrichAppointmentsWithApiPayment,
  isAppointmentPending,
  isPaidActiveAppointment,
  showsAppointmentPaymentActions,
  buildPaymentFromApiFields,
  matchesAppointmentStatusFilter,
  countAppointmentsByStatusFilter,
} from '@/features/opd/utils/appointmentPaymentUtils';
import { useDepartmentsQuery, useDoctorsByDepartmentQuery } from '@/shared/hooks/queries/useOpdReferenceQuery';
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue';
import {
  Button,
  Input,
  DateInput,
  StatusBadge,
  Modal,
  Textarea,
  TimeSlotGrid,
  Label,
  SearchBar,
  DataTableShell,
  QueryFeedback,
  ConfirmDialog,
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

const APPOINTMENT_LIST_PAGE_SIZE = 10;

const CLIENT_FILTER_STATUSES = new Set(['All', 'Scheduled', 'Pending']);

const SERVER_LIST_FILTER = {
  Completed: 'completed',
  Cancelled: 'cancelled',
};

export default function AppointmentListPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [filterDept, setFilterDept] = useState('All');
  const [filterDoc, setFilterDoc] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(search.trim(), 300);
  const usesClientStatusFilter = CLIENT_FILTER_STATUSES.has(filterStatus);

  const sharedFilters = {
    search: debouncedSearch || undefined,
    department_id: filterDept !== 'All' ? Number(filterDept) : undefined,
    doctor_id: filterDoc !== 'All' ? Number(filterDoc) : undefined,
    date: filterDate || undefined,
    sort: 'scheduled_at',
    order: 'desc',
  };

  const { data, isLoading, isFetching, isError, error } = useAppointmentsQuery({
    fetchAll: usesClientStatusFilter,
    page: usesClientStatusFilter ? 1 : page,
    limit: usesClientStatusFilter ? 200 : APPOINTMENT_LIST_PAGE_SIZE,
    list_filter: usesClientStatusFilter ? undefined : SERVER_LIST_FILTER[filterStatus],
    ...sharedFilters,
    keepPrevious: !usesClientStatusFilter,
  });

  const { data: countData } = useAppointmentsQuery({
    fetchAll: true,
    limit: 200,
    ...sharedFilters,
    keepPrevious: false,
  });

  const enrichedAppointments = useMemo(
    () => enrichAppointmentsWithApiPayment(asAppointmentList(data)),
    [data]
  );

  const filteredAppointments = useMemo(() => {
    if (!usesClientStatusFilter) return enrichedAppointments;
    return enrichedAppointments.filter((appt) =>
      matchesAppointmentStatusFilter(appt, filterStatus, appt.payment)
    );
  }, [enrichedAppointments, filterStatus, usesClientStatusFilter]);

  const visibleAppointments = useMemo(() => {
    if (!usesClientStatusFilter) return enrichedAppointments;
    const start = (page - 1) * APPOINTMENT_LIST_PAGE_SIZE;
    return filteredAppointments.slice(start, start + APPOINTMENT_LIST_PAGE_SIZE);
  }, [enrichedAppointments, filteredAppointments, page, usesClientStatusFilter]);

  const pageMeta = asAppointmentPageMeta(data);

  const { data: departments = [] } = useDepartmentsQuery();
  const { data: deptDoctors = [] } = useDoctorsByDepartmentQuery(
    filterDept !== 'All' ? filterDept : undefined
  );
  const updateAppointment = useUpdateAppointmentMutation();
  const cancelAppointment = useCancelAppointmentMutation();
  const [selectedAppt, setSelectedAppt] = useState(null);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentContext, setPaymentContext] = useState(null);
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
    setPage(1);
  }, [debouncedSearch, filterDate, filterDept, filterDoc, filterStatus]);

  const statusCounts = useMemo(() => {
    const appts = enrichAppointmentsWithApiPayment(asAppointmentList(countData));
    return STATUS_PILLS.reduce((acc, pill) => {
      acc[pill.key] = countAppointmentsByStatusFilter(appts, pill.key);
      return acc;
    }, {});
  }, [countData]);

  const showPaymentActions = showsAppointmentPaymentActions(filterStatus);
  const listTotal = usesClientStatusFilter ? filteredAppointments.length : pageMeta.total;
  const paginationTotalPages = Math.max(
    1,
    usesClientStatusFilter
      ? Math.ceil(filteredAppointments.length / APPOINTMENT_LIST_PAGE_SIZE)
      : pageMeta.totalPages
  );
  const emptyListMessage =
    filterStatus === 'All'
      ? 'No appointments found'
      : `No ${filterStatus.toLowerCase()} appointments found`;

  const openCancelAppointment = (appt) => {
    setSelectedAppt(appt);
    setCancelOpen(true);
  };

  const formatFilterDate = (d) =>
    d
      ? new Date(d).toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        })
      : '';

  const openCollectPayment = (appt) => {
    const payment = appt.payment ?? buildPaymentFromApiFields(appt);
    const visitId = payment?.bill?.visitId ?? appt.billId ?? appt.visitId ?? null;
    const billNumber = payment?.bill?.billNumber ?? appt.billNumber ?? null;
    const balance =
      Number(payment?.bill?.balance ?? appt.balanceAmount ?? 0) ||
      Math.max(
        0,
        Number(payment?.bill?.total ?? appt.totalAmount ?? 0) -
          Number(payment?.bill?.paid ?? appt.paidAmount ?? 0),
      );

    setPaymentContext({
      billNumber: billNumber ?? undefined,
      visitId: visitId ?? undefined,
      patientUid: appt.patientUid ?? appt.patientId ?? undefined,
      patientDbId: appt.patientDbId ?? undefined,
      appointmentDate: appt.date ?? undefined,
      prefill:
        visitId != null
          ? {
              id: billNumber ?? String(visitId),
              visitId,
              billNumber,
              patientName: appt.patientName,
              patientId: appt.patientUid ?? appt.patientId,
              total: Number(payment?.bill?.total ?? appt.totalAmount ?? 0),
              paid: Number(payment?.bill?.paid ?? appt.paidAmount ?? 0),
              balance: balance || Number(payment?.bill?.total ?? appt.totalAmount ?? 0),
              status: 'Unpaid',
            }
          : undefined,
    });
    setPaymentModalOpen(true);
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

  return (
    <QueryFeedback isLoading={isLoading && !data} isError={isError} error={error}>
      <div className="page-stack appointments-page">
        <div className="page-header appointments-page__header">
          <div className="appointments-page__title-wrap">
            <h2 className="page-title">Appointments</h2>
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
          <div className="page-toolbar appointment-toolbar">
            <SearchBar
              value={search}
              onChange={setSearch}
              placeholder="Search patient, ID, doctor..."
            />
            <DateInput
              id="appointments-date-filter"
              className="appointment-date-filter"
              label="Date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              placeholder="Select date"
            />
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
            className="appointments-page__table-shell"
            pagination={{
              page,
              totalPages: paginationTotalPages,
              totalItems: listTotal,
              pageSize: APPOINTMENT_LIST_PAGE_SIZE,
              onPageChange: setPage,
              itemLabel: 'Appointments',
            }}
          >
            <table className="data-table appointment-table">
              <thead>
                <tr>
                  <th>Patient</th>
                  <th className="col-optional">Doctor / Dept</th>
                  <th>Schedule</th>
                  <th>Status</th>
                  {showPaymentActions && <th>Payment</th>}
                  {showPaymentActions && <th className="actions-col">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {visibleAppointments.map((appt) => (
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
                      <span className="time-pill">{appt.time}</span>
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
                      <td
                        className="actions-cell actions-cell--center appointments-table__actions"
                        onClick={(e) => e.stopPropagation()}
                      >
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
                        )}
                        {appt.status === 'Scheduled' && (
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => openCancelAppointment(appt)}
                          >
                            Cancel
                          </Button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
                {!visibleAppointments.length && (
                  <tr>
                    <td colSpan={showPaymentActions ? 6 : 4} className="empty-row">
                      {isFetching ? 'Loading appointments…' : emptyListMessage}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </DataTableShell>
        </div>

        <Modal
          isOpen={rescheduleOpen}
          onClose={() => setRescheduleOpen(false)}
          title="Reschedule"
          footer={
            <>
              <Button variant="outline" onClick={() => setRescheduleOpen(false)}>
                Close
              </Button>
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
              if (rescheduleErrors.newDate) {
                setRescheduleErrors((prev) => ({ ...prev, newDate: undefined }));
              }
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
                  if (rescheduleErrors.newTime) {
                    setRescheduleErrors((prev) => ({ ...prev, newTime: undefined }));
                  }
                }}
                apiSlots={rescheduleSlots}
                useApiSlots
                slotsLoading={rescheduleSlotsLoading}
                slotsError={rescheduleSlotsError}
              />
              {rescheduleErrors.newTime && (
                <p className="field__error">{rescheduleErrors.newTime}</p>
              )}
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
            setPaymentContext(null);
          }}
          defaultBillId={paymentContext?.billNumber}
          defaultVisitId={paymentContext?.visitId}
          prefillBill={paymentContext?.prefill}
          patientUid={paymentContext?.patientUid}
          patientDbId={paymentContext?.patientDbId}
          appointmentDate={paymentContext?.appointmentDate}
          onCollected={() => setFilterStatus('Scheduled')}
        />
      </div>
    </QueryFeedback>
  );
}

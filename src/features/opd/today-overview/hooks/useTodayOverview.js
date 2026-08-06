import { useMemo } from 'react';
import { useOpdDashboardQuery } from '@/shared/hooks/queries/useOpdDashboardQuery';
import { useAppointmentsQuery } from '@/shared/hooks/queries/useAppointmentQuery';
import { usePatientsQuery } from '@/shared/hooks/queries/usePatientQuery';
import { usePaymentHistoryQuery } from '@/shared/hooks/queries/useBillingQuery';
import {
  asAppointmentList,
  asBillList,
  asPatientList,
} from '@/shared/hooks/queries/listDataUtils';
import { getTodayRangeIso } from '@/shared/utils/opdDates';
import { formatPatientRegisteredDate } from '@/shared/api/mappers/patientMapper';
import { useTodayVisitsQuery } from './useTodayVisitsQuery';
import { useTodayBillsQuery } from './useTodayBillsQuery';
import {
  isToday,
  matchesSelection,
  matchesTimeOfDay,
  minutesSince,
  normalizePaymentStatus,
  optionsFromNames,
  sumBy,
  toTimestamp,
} from '../utils/todayOverviewUtils';

const PAGE_LIMIT = 100;
const LONG_WAIT_MINUTES = 30;

export const DEFAULT_TODAY_FILTERS = {
  doctor: 'all',
  department: 'all',
  paymentStatus: 'all',
  status: 'all',
  timeOfDay: 'all',
};

function sectionState(query) {
  return {
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
  };
}

/**
 * Aggregates today's OPD activity from the existing OPD endpoints.
 * No new backend calls — every section is derived from data the module already exposes.
 */
export function useTodayOverview(filters = DEFAULT_TODAY_FILTERS) {
  const { dateKey } = getTodayRangeIso();

  const dashboardQuery = useOpdDashboardQuery();
  const appointmentsQuery = useAppointmentsQuery({
    fetchAll: false,
    date: dateKey,
    page: 1,
    limit: PAGE_LIMIT,
    sort: 'scheduled_at',
    order: 'asc',
  });
  const visitsQuery = useTodayVisitsQuery();
  const billsQuery = useTodayBillsQuery();
  const patientsQuery = usePatientsQuery({
    fetchAll: false,
    page: 1,
    limit: PAGE_LIMIT,
  });
  const paymentsQuery = usePaymentHistoryQuery({ page: 1, limit: PAGE_LIMIT });

  const allAppointments = useMemo(
    () => asAppointmentList(appointmentsQuery.data),
    [appointmentsQuery.data]
  );
  const allVisits = useMemo(
    () => visitsQuery.data?.visits ?? [],
    [visitsQuery.data]
  );
  const allBills = useMemo(() => asBillList(billsQuery.data), [billsQuery.data]);

  const allRegistrations = useMemo(() => {
    const todayLabel = formatPatientRegisteredDate(new Date().toISOString());
    return asPatientList(patientsQuery.data).filter((patient) =>
      patient.createdAt
        ? isToday(patient.createdAt)
        : patient.registeredDate === todayLabel
    );
  }, [patientsQuery.data]);

  const allPayments = useMemo(
    () => (paymentsQuery.data?.payments ?? []).filter((p) => isToday(p.dateSort)),
    [paymentsQuery.data]
  );

  const filterOptions = useMemo(() => {
    const doctors = optionsFromNames([
      ...allAppointments.map((a) => a.doctorName),
      ...allVisits.map((v) => v.doctorName),
    ]);
    const departments = optionsFromNames([
      ...allAppointments.map((a) => a.deptName),
      ...allVisits.map((v) => v.department),
    ]);
    const statuses = optionsFromNames([
      ...allAppointments.map((a) => a.status),
      ...allVisits.map((v) => v.status),
    ]);
    return { doctors, departments, statuses };
  }, [allAppointments, allVisits]);

  const appointments = useMemo(
    () =>
      allAppointments.filter(
        (appt) =>
          matchesSelection(filters.doctor, appt.doctorName) &&
          matchesSelection(filters.department, appt.deptName) &&
          matchesSelection(filters.status, appt.status) &&
          matchesTimeOfDay(filters.timeOfDay, appt.scheduledAt)
      ),
    [allAppointments, filters.doctor, filters.department, filters.status, filters.timeOfDay]
  );

  const appointmentPatientKeys = useMemo(
    () =>
      new Set(
        allAppointments
          .map((appt) => appt.patientUid ?? appt.patientId)
          .filter(Boolean)
          .map(String)
      ),
    [allAppointments]
  );

  const visits = useMemo(
    () =>
      allVisits
        .map((visit) => ({
          ...visit,
          visitType:
            visit.patientUid && appointmentPatientKeys.has(String(visit.patientUid))
              ? 'Appointment'
              : 'Walk-in',
        }))
        .filter(
          (visit) =>
            matchesSelection(filters.doctor, visit.doctorName) &&
            matchesSelection(filters.department, visit.department) &&
            matchesSelection(filters.status, visit.status) &&
            matchesSelection(
              filters.paymentStatus,
              normalizePaymentStatus(visit.paymentStatus, {
                total: visit.grandTotal,
                paid: visit.paidAmount,
                balance: visit.balanceDue,
              })
            ) &&
            matchesTimeOfDay(filters.timeOfDay, visit.visitDateIso)
        ),
    [
      allVisits,
      appointmentPatientKeys,
      filters.doctor,
      filters.department,
      filters.status,
      filters.paymentStatus,
      filters.timeOfDay,
    ]
  );

  const bills = useMemo(
    () =>
      allBills.filter(
        (bill) =>
          matchesSelection(
            filters.paymentStatus,
            normalizePaymentStatus(bill.status, {
              total: bill.total,
              paid: bill.paid,
              balance: bill.balance,
            })
          ) && matchesTimeOfDay(filters.timeOfDay, bill.dateIso)
      ),
    [allBills, filters.paymentStatus, filters.timeOfDay]
  );

  const registrations = useMemo(
    () =>
      allRegistrations.filter((patient) =>
        matchesTimeOfDay(filters.timeOfDay, patient.createdAt)
      ),
    [allRegistrations, filters.timeOfDay]
  );

  const payments = useMemo(
    () => allPayments.filter((payment) => matchesTimeOfDay(filters.timeOfDay, payment.dateSort)),
    [allPayments, filters.timeOfDay]
  );

  const walkInVisits = useMemo(
    () => visits.filter((visit) => visit.visitType === 'Walk-in'),
    [visits]
  );

  const billing = useMemo(() => {
    const paidBills = bills.filter((bill) => normalizePaymentStatus(bill.status, bill) === 'Paid');
    const partialBills = bills.filter(
      (bill) => normalizePaymentStatus(bill.status, bill) === 'Partial'
    );
    const pendingBills = bills.filter((bill) => Number(bill.balance ?? 0) > 0.01);

    // Unfiltered totals come from the server summary so they stay exact beyond the first page.
    const serverSummary =
      filters.paymentStatus === 'all' && filters.timeOfDay === 'all'
        ? billsQuery.data?.summary
        : null;

    return {
      rows: bills,
      generated: bills.length,
      paid: paidBills.length,
      partial: partialBills.length,
      pending: pendingBills.length,
      billed: Number(serverSummary?.total_billed ?? sumBy(bills, (bill) => bill.total)),
      collected: Number(serverSummary?.total_collected ?? sumBy(bills, (bill) => bill.paid)),
      outstanding: Number(
        serverSummary?.total_outstanding ?? sumBy(pendingBills, (bill) => bill.balance)
      ),
    };
  }, [bills, billsQuery.data, filters.paymentStatus, filters.timeOfDay]);

  const paymentSummary = useMemo(() => {
    const byMode = new Map();
    for (const payment of payments) {
      const mode = payment.mode || 'Cash';
      const current = byMode.get(mode) ?? { mode, amount: 0, count: 0 };
      current.amount += Number(payment.amount) || 0;
      current.count += 1;
      byMode.set(mode, current);
    }
    for (const mode of ['Cash', 'Card', 'UPI', 'Insurance']) {
      if (!byMode.has(mode)) byMode.set(mode, { mode, amount: 0, count: 0 });
    }
    const modes = [...byMode.values()];
    const collected = sumBy(modes, (row) => row.amount);
    return {
      modes: modes.sort((a, b) => b.amount - a.amount),
      collected,
      transactions: payments.length,
      rows: payments,
    };
  }, [payments]);

  const doctorActivity = useMemo(() => {
    const doctorOf = (row) => row.doctorName || 'Unassigned';
    const names = [...new Set([...appointments.map(doctorOf), ...visits.map(doctorOf)])];

    return names
      .map((doctor) => {
        const doctorAppointments = appointments.filter((appt) => doctorOf(appt) === doctor);
        const doctorVisits = visits.filter((visit) => doctorOf(visit) === doctor);
        const countByStatus = (status) =>
          doctorAppointments.filter((appt) => appt.status === status).length;
        const completed = countByStatus('Completed');
        const inProgress = countByStatus('In Progress');
        return {
          doctor,
          registered: doctorVisits.length,
          waiting: countByStatus('Waiting') + countByStatus('Scheduled'),
          inProgress,
          completed,
          cancelled: countByStatus('Cancelled'),
          seen: completed + inProgress,
        };
      })
      .sort((a, b) => b.seen - a.seen || a.doctor.localeCompare(b.doctor));
  }, [appointments, visits]);

  const alerts = useMemo(() => {
    const rows = [];
    if (billing.pending > 0) {
      rows.push({
        id: 'pending-bills',
        tone: 'warning',
        title: `${billing.pending} bill${billing.pending > 1 ? 's' : ''} awaiting payment`,
        description: 'Outstanding balance on bills raised today.',
        amount: billing.outstanding,
      });
    }
    const longWaiting = appointments.filter(
      (appt) =>
        appt.status === 'Waiting' && (minutesSince(appt.scheduledAt) ?? 0) > LONG_WAIT_MINUTES
    );
    if (longWaiting.length > 0) {
      rows.push({
        id: 'long-waiting',
        tone: 'danger',
        title: `${longWaiting.length} patient${longWaiting.length > 1 ? 's' : ''} waiting over ${LONG_WAIT_MINUTES} minutes`,
        description: longWaiting
          .slice(0, 3)
          .map((appt) => appt.patientName)
          .filter(Boolean)
          .join(', '),
      });
    }
    const cancelled = appointments.filter((appt) => appt.status === 'Cancelled');
    if (cancelled.length > 0) {
      rows.push({
        id: 'cancelled',
        tone: 'info',
        title: `${cancelled.length} appointment${cancelled.length > 1 ? 's' : ''} cancelled today`,
        description: 'Review and reschedule where needed.',
      });
    }
    return rows;
  }, [appointments, billing.pending, billing.outstanding]);

  const timeline = useMemo(() => {
    const events = [];

    for (const patient of registrations) {
      events.push({
        id: `reg-${patient.dbId ?? patient.id}`,
        type: 'registration',
        at: patient.createdAt,
        title: 'Patient registered',
        detail: [patient.name, patient.id].filter(Boolean).join(' · '),
      });
    }

    for (const appt of appointments) {
      events.push({
        id: `appt-${appt.id}`,
        type: appt.status === 'Completed' ? 'completed' : 'appointment',
        at: appt.scheduledAt,
        title: appt.status === 'Completed' ? 'Consultation completed' : 'Appointment scheduled',
        detail: [appt.patientName, appt.doctorName].filter(Boolean).join(' · '),
      });
    }

    for (const visit of visits) {
      events.push({
        id: `visit-${visit.visitId}`,
        type: 'visit',
        at: visit.visitDateIso,
        title: 'OPD visit registered',
        detail: [visit.patientName, visit.billNumber].filter(Boolean).join(' · '),
      });
    }

    for (const payment of payments) {
      events.push({
        id: `pay-${payment.id}`,
        type: 'payment',
        at: payment.dateSort,
        title: 'Payment collected',
        detail: [payment.patientName, payment.mode].filter(Boolean).join(' · '),
        amount: payment.amount,
      });
    }

    return events
      .filter((event) => event.at)
      .sort((a, b) => toTimestamp(b.at) - toTimestamp(a.at));
  }, [registrations, appointments, visits, payments]);

  const stats = useMemo(
    () => ({
      registrations: registrations.length,
      visits: visits.length,
      appointments: appointments.length,
      walkIns: walkInVisits.length,
      billsGenerated: billing.generated,
      collected: billing.collected,
      pendingBills: billing.pending,
      outstanding: billing.outstanding,
      cancelledAppointments: appointments.filter((appt) => appt.status === 'Cancelled').length,
      billedToday: billing.billed,
      totalPatients: dashboardQuery.data?.patientsTotal ?? 0,
    }),
    [registrations.length, visits.length, appointments, walkInVisits.length, billing, dashboardQuery.data]
  );

  const queries = [
    dashboardQuery,
    appointmentsQuery,
    visitsQuery,
    billsQuery,
    patientsQuery,
    paymentsQuery,
  ];

  const lastUpdated = Math.max(...queries.map((query) => query.dataUpdatedAt || 0));
  const isFetching = queries.some((query) => query.isFetching);

  const refresh = () => {
    queries.forEach((query) => query.refetch());
  };

  return {
    stats,
    filterOptions,
    lastUpdated: lastUpdated || null,
    isFetching,
    refresh,
    sections: {
      stats: {
        ...sectionState(visitsQuery),
        isLoading:
          visitsQuery.isLoading ||
          billsQuery.isLoading ||
          appointmentsQuery.isLoading ||
          patientsQuery.isLoading,
      },
      registrations: { rows: registrations, ...sectionState(patientsQuery) },
      appointments: { rows: appointments, ...sectionState(appointmentsQuery) },
      visits: { rows: visits, ...sectionState(visitsQuery) },
      billing: { ...billing, ...sectionState(billsQuery) },
      payments: { ...paymentSummary, ...sectionState(paymentsQuery) },
      doctorActivity: { rows: doctorActivity, ...sectionState(appointmentsQuery) },
      timeline: { rows: timeline, ...sectionState(appointmentsQuery) },
      alerts: { rows: alerts, ...sectionState(billsQuery) },
    },
  };
}

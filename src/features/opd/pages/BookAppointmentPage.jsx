import { useMemo, useState, useCallback, useEffect } from 'react';

import { useNavigate } from 'react-router-dom';

import { ArrowLeft, CheckCircle2, AlertCircle, Clock, Stethoscope, User, Phone } from 'lucide-react';

import {
  usePatientsQuery,
  usePatientQuery,
  usePatientProfileQuery,
} from '@/shared/hooks/queries/usePatientQuery';
import { asPatientList, asAppointmentList } from '@/shared/hooks/queries/listDataUtils';

import { useBookAppointmentMutation, useDoctorSlotsQuery, useAppointmentsQuery } from '@/shared/hooks/queries/useAppointmentQuery';
import { useCreateBillMutation } from '@/shared/hooks/queries/useBillingQuery';
import {
  useDepartmentsQuery,
  useDoctorsByDepartmentQuery,
} from '@/shared/hooks/queries/useOpdReferenceQuery';

import { REGISTRATION_FEE, ROUTES, TAX_RATE, PAYMENT_MODES } from '@/shared/constants';

import { Button, Input, Label, SearchableSelect, TimeSlotGrid, QueryFeedback } from '@/shared/components/common';

import { getRevisitInfoFromVisits } from '@/shared/utils/revisit';

import { generateAppointmentId } from '@/shared/utils/billHelpers';

import { formatCurrency } from '@/shared/utils/formatCurrency';

import { trimForm } from '@/shared/utils/trimForm';

import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue';
import { useFormValidation } from '@/shared/hooks/useFormValidation';

import { toast } from '@/shared/utils/toast';

import { validatePaymentTransactionRef, requiresTransactionReference } from '@/shared/utils/validators';
import { APPT_PAY_LATER_NOTE } from '@/features/opd/utils/appointmentPaymentUtils';
import {
  BOOK_APPOINTMENT_INITIAL_VALUES,
  validateAppointment,
} from '@/features/opd/utils/bookAppointmentValidation';
import {
  buildBookedPatientKeys,
  filterPatientsAvailableForBooking,
  patientHasActiveBookedAppointment,
} from '@/features/opd/utils/bookAppointmentPatientUtils';
import './BookAppointmentPage.css';

export default function BookAppointmentPage() {
  const [patientSearch, setPatientSearch] = useState('');
  const [payLater, setPayLater] = useState(false);
  const [paymentMode, setPaymentMode] = useState('Cash');
  const [amountReceived, setAmountReceived] = useState('');
  const [paymentRef, setPaymentRef] = useState('');
  const debouncedPatientSearch = useDebouncedValue(patientSearch.trim(), 300);

  const { data: patientsData, isLoading, isError, error } = usePatientsQuery({
    fetchAll: false,
    search: debouncedPatientSearch || undefined,
    limit: 50,
    page: 1,
  });
  const patients = asPatientList(patientsData);

  const { data: scheduledAppointmentsData, isLoading: loadingScheduledAppts } = useAppointmentsQuery({
    fetchAll: true,
    status: 'scheduled',
  });

  const bookedPatientKeys = useMemo(
    () => buildBookedPatientKeys(asAppointmentList(scheduledAppointmentsData)),
    [scheduledAppointmentsData],
  );

  const bookablePatients = useMemo(
    () => filterPatientsAvailableForBooking(patients, bookedPatientKeys),
    [patients, bookedPatientKeys],
  );

  const { data: departments = [] } = useDepartmentsQuery();

  const bookAppointment = useBookAppointmentMutation();
  const createBill = useCreateBillMutation();

  const navigate = useNavigate();

  const { values, errors, handleChange, handleSubmit } = useFormValidation(
    BOOK_APPOINTMENT_INITIAL_VALUES,
    validateAppointment,
  );

  const { patientId, deptId, doctorId, dateStr, time, reason } = values;

  const set = (key, val) => handleChange(key, val);

  const handlePatientSelectChange = useCallback((v) => {
    set('patientId', v);
    if (!v) setPatientSearch('');
    set('deptId', '');
    set('doctorId', '');
    set('dateStr', '');
    set('time', '');
  }, [handleChange]);

  const handleDeptSelectChange = useCallback((v) => {
    set('deptId', v);
    set('doctorId', '');
  }, [handleChange]);

  const handleDoctorSelectChange = useCallback((v) => {
    set('doctorId', v);
    set('dateStr', '');
    set('time', '');
  }, [handleChange]);

  const { data: doctors = [] } = useDoctorsByDepartmentQuery(deptId);

  const { data: patientDetail } = usePatientQuery(patientId);
  const selectedPatient =
    patients.find((p) => p.id === patientId) ?? patientDetail ?? null;

  const { data: patientProfile } = usePatientProfileQuery(selectedPatient?.dbId);
  const profileVisits = patientProfile?.visits ?? [];

  const selectedDept = departments.find((d) => String(d.id) === String(deptId));
  const selectedDoctor = doctors.find((d) => String(d.id) === String(doctorId));

  const {
    data: apiSlots = [],
    isLoading: slotsLoading,
    isPending: slotsPending,
    isError: slotsError,
  } = useDoctorSlotsQuery({
    doctorId,
    departmentId: deptId,
    date: dateStr,
    enabled: Boolean(dateStr && doctorId && deptId),
  });

  const revisit = getRevisitInfoFromVisits(profileVisits);

  const patientOptions = useMemo(() => {
    const opts = bookablePatients.map((p) => ({
      value: p.id,
      label: p.name,
      sublabel: p.phone,
      badge: p.id,
      searchText: `${p.id} ${p.name} ${p.phone}`.toLowerCase(),
    }));

    if (
      patientId &&
      !opts.some((o) => o.value === patientId) &&
      selectedPatient
    ) {
      opts.unshift({
        value: selectedPatient.id,
        label: selectedPatient.name,
        sublabel: selectedPatient.phone,
        badge: selectedPatient.id,
        searchText: `${selectedPatient.id} ${selectedPatient.name} ${selectedPatient.phone}`.toLowerCase(),
      });
    }

    return opts;
  }, [bookablePatients, patientId, selectedPatient]);

  useEffect(() => {
    if (!patientId) return;
    const current =
      patients.find((p) => p.id === patientId) ??
      (patientDetail?.id === patientId ? patientDetail : null);
    if (current && patientHasActiveBookedAppointment(current, bookedPatientKeys)) {
      handlePatientSelectChange('');
      toast.info('This patient already has an active appointment. Reschedule from Appointments.');
    }
  }, [patientId, patients, patientDetail, bookedPatientKeys, handlePatientSelectChange]);

  const patientHistory = useMemo(() => {
    if (!patientId || !profileVisits.length) return null;
    const last = profileVisits[0];
    return {
      last: last
        ? { date: last.visitDate, deptName: last.department, doctorName: last.doctorName }
        : null,
    };
  }, [profileVisits, patientId]);

  const onSubmit = handleSubmit(async (rawValues) => {
    const trimmed = trimForm(rawValues);

    if (!trimmed.time) {
      toast.error('Please select a time slot');
      return;
    }

    if (!selectedPatient?.dbId) {
      toast.error('Patient record is required');
      return;
    }

    if (patientHasActiveBookedAppointment(selectedPatient, bookedPatientKeys)) {
      toast.error('This patient already has an active appointment. Reschedule from Appointments.');
      return;
    }

    const subtotal = fee;
    const tax = Math.round(subtotal * TAX_RATE * 100) / 100;
    const grandTotal = subtotal + tax;

    if (!payLater) {
      const paid = Math.min(Number(amountReceived) || 0, grandTotal);
      const refError = validatePaymentTransactionRef(paymentMode, paymentRef, {
        paidAmount: paid,
        payLater: false,
      });
      if (refError) {
        toast.error(refError);
        return;
      }
      if (grandTotal > 0 && paid < grandTotal) {
        toast.error('Collect full payment before confirming booking');
        return;
      }
    }

    try {
      if (selectedDoctor && selectedDept && grandTotal > 0) {
        await createBill.mutateAsync({
          patientDbId: selectedPatient.dbId,
          deptId: selectedDept.id,
          doctorId: selectedDoctor.id,
          registrationFee: revisit.registrationFeeApplicable ? REGISTRATION_FEE : 0,
          consultationFee: selectedDoctor.fee,
          gstPercent: TAX_RATE * 100,
          payLater,
          paymentMode,
          paid: payLater ? 0 : grandTotal,
          paymentRef: paymentRef.trim() || undefined,
          status: payLater ? 'Unpaid' : 'Paid',
          items: [],
        });
      }

      const newAppt = {
        id: generateAppointmentId(0),
        patientId: selectedPatient.id,
        patientDbId: selectedPatient.dbId,
        patientName: selectedPatient.name,
        deptId: selectedDept.id,
        deptName: selectedDept.name,
        doctorId: selectedDoctor.id,
        doctorName: selectedDoctor.name.startsWith('Dr.')
          ? selectedDoctor.name
          : `Dr. ${selectedDoctor.name}`,
        date: new Date(trimmed.dateStr).toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        }),
        time: trimmed.time,
        status: 'Scheduled',
        type: 'New',
        consultStatus: 'Waiting',
        reason: trimmed.reason,
        notes: payLater ? APPT_PAY_LATER_NOTE : undefined,
      };

      await bookAppointment.mutateAsync(newAppt);
      toast.success(
        payLater
          ? `Booked for ${selectedPatient.name} — payment pending`
          : `Booked and paid for ${selectedPatient.name}`,
      );
      navigate(ROUTES.APPOINTMENTS);
    } catch {
      /* mutationOnError handles toast */
    }
  });

  const fee = selectedDoctor
    ? selectedDoctor.fee + (revisit.registrationFeeApplicable ? REGISTRATION_FEE : 0)
    : 0;

  const tax = Math.round(fee * TAX_RATE * 100) / 100;
  const grandTotal = fee + tax;
  const isSaving = bookAppointment.isPending || createBill.isPending;

  useEffect(() => {
    if (!payLater && grandTotal > 0) {
      setAmountReceived(String(grandTotal));
    }
  }, [grandTotal, payLater]);

  const revisitStatus = !patientId
    ? null
    : !revisit.lastAppt
      ? 'new'
      : revisit.isRevisit
        ? 'valid'
        : 'expired';

  const patientInitials = selectedPatient?.name
    ? selectedPatient.name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0])
        .join('')
        .toUpperCase()
    : '';

  return (
    <QueryFeedback isLoading={isLoading || loadingScheduledAppts} isError={isError} error={error}>
      <div className="book-appointment book-appointment-page page-container page-stack">
        <header className="book-appointment-page__header">
          <Button variant="outline" size="sm" type="button" onClick={() => navigate(ROUTES.APPOINTMENTS)}>
            <ArrowLeft size={16} aria-hidden /> Back
          </Button>
          <h2 className="page-title book-appointment-page__title">Book Appointment</h2>
        </header>

        <div className="card book-appointment-page__card">
          <form onSubmit={onSubmit} className="book-form">
            <section className="book-panel">
              <header className="book-panel__head">
                <span className="book-panel__icon book-panel__icon--patient" aria-hidden>
                  <User size={15} />
                </span>
                <h3 className="book-panel__title">Patient</h3>
              </header>
              <div className="book-panel__body">
                <Label>Search patient *</Label>
                <SearchableSelect
                  options={patientOptions}
                  value={patientId}
                  onSearchChange={setPatientSearch}
                  onChange={handlePatientSelectChange}
                  placeholder="Type ID, name or phone..."
                  clearOnEmptyBlur
                  error={errors.patientId}
                />

                {selectedPatient && (
                  <div className="book-patient-card" aria-label="Selected patient details">
                    <div className="book-patient-card__top">
                      <div className="book-patient-card__avatar" aria-hidden>
                        {patientInitials || <User size={20} />}
                      </div>
                      <div className="book-patient-card__main">
                        <h4 className="book-patient-card__name">{selectedPatient.name}</h4>
                        <div className="book-patient-card__meta">
                          <span className="book-patient-card__id">{selectedPatient.id}</span>
                          {selectedPatient.phone && (
                            <span className="book-patient-card__phone">
                              <Phone size={12} aria-hidden />
                              {selectedPatient.phone}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="book-patient-card__badge">
                        {revisitStatus === 'valid' && (
                          <span className="book-tag book-tag--success">
                            <CheckCircle2 size={13} aria-hidden />
                            Revisit eligible
                          </span>
                        )}
                        {revisitStatus === 'expired' && (
                          <span className="book-tag book-tag--warning">
                            <AlertCircle size={13} aria-hidden />
                            Reg. fee due
                          </span>
                        )}
                        {revisitStatus === 'new' && (
                          <span className="book-tag book-tag--info">
                            First visit
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="book-patient-card__history">
                      <div className="book-patient-card__history-item">
                        <Clock size={14} aria-hidden />
                        <span>
                          <em>Last visit</em>
                          {patientHistory?.last
                            ? `${patientHistory.last.date} · ${patientHistory.last.deptName}`
                            : 'No completed visits'}
                        </span>
                      </div>
                      <div className="book-patient-card__history-item">
                        <Stethoscope size={14} aria-hidden />
                        <span>
                          <em>Previous doctor</em>
                          {patientHistory?.last?.doctorName || '—'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </section>

            <section className="book-panel">
              <header className="book-panel__head">
                <span className="book-panel__icon book-panel__icon--visit" aria-hidden>
                  <Stethoscope size={15} />
                </span>
                <h3 className="book-panel__title">Appointment details</h3>
              </header>
              <div className="book-panel__body">
                <div className="form-grid">
                  <div>
                    <Label>Department *</Label>
                    <SearchableSelect
                      options={departments.map((d) => ({ value: d.id, label: d.name }))}
                      value={deptId}
                      onChange={handleDeptSelectChange}
                      disabled={!patientId}
                    />
                  </div>
                  <div>
                    <Label>Doctor *</Label>
                    <SearchableSelect
                      options={doctors
                        .filter((d) => !deptId || d.deptId === deptId)
                        .map((d) => ({
                          value: d.id,
                          label: d.name.startsWith('Dr.') ? d.name : `Dr. ${d.name}`,
                          sublabel: `${d.specialization} — ${formatCurrency(d.fee)}`,
                        }))}
                      value={doctorId}
                      onChange={handleDoctorSelectChange}
                      disabled={!deptId}
                      error={errors.doctorId}
                    />
                  </div>
                </div>
                <div className="form-grid">
                  <Input
                    type="date"
                    label="Date *"
                    value={dateStr}
                    disabled={!doctorId}
                    onChange={(e) => {
                      set('dateStr', e.target.value);
                      set('time', '');
                    }}
                    min={new Date().toISOString().split('T')[0]}
                    error={errors.dateStr}
                  />
                  <Input
                    label="Reason for visit"
                    value={reason}
                    placeholder="Brief reason (optional)"
                    onChange={(e) => set('reason', e.target.value)}
                  />
                </div>
              </div>
            </section>

            {dateStr && doctorId && (
              <section className="book-panel">
                <header className="book-panel__head">
                  <span className="book-panel__icon book-panel__icon--time" aria-hidden>
                    <Clock size={15} />
                  </span>
                  <h3 className="book-panel__title">Time slot</h3>
                </header>
                <div className="book-panel__body book-panel__body--slots">
                  <TimeSlotGrid
                    className="time-slot-grid--compact"
                    date={new Date(dateStr)}
                    doctorId={doctorId}
                    departmentId={deptId}
                    selectedTime={time}
                    onSelectTime={(t) => set('time', t)}
                    apiSlots={apiSlots}
                    useApiSlots
                    slotsLoading={slotsLoading || slotsPending}
                    slotsError={slotsError}
                  />
                </div>
              </section>
            )}

            {selectedDoctor && (
              <section className="book-panel book-panel--payment">
                <header className="book-panel__head">
                  <span className="book-panel__icon book-panel__icon--pay" aria-hidden>
                    <CheckCircle2 size={15} />
                  </span>
                  <h3 className="book-panel__title">Payment</h3>
                </header>
                <div className="book-panel__body book-payment">
                  <div className="book-fee-box">
                    {revisit.registrationFeeApplicable && (
                      <div className="book-fee-box__row">
                        <span>Registration fee</span>
                        <span>{formatCurrency(REGISTRATION_FEE)}</span>
                      </div>
                    )}
                    <div className="book-fee-box__row">
                      <span>Consultation fee</span>
                      <span>{formatCurrency(selectedDoctor.fee)}</span>
                    </div>
                    <div className="book-fee-box__row book-fee-box__row--total">
                      <span>Estimated total</span>
                      <strong>{formatCurrency(grandTotal)}</strong>
                    </div>
                  </div>

                  <div className="book-payment__controls">
                    <label className="book-payment__pay-later">
                      <input
                        type="checkbox"
                        checked={payLater}
                        onChange={(e) => setPayLater(e.target.checked)}
                      />
                      Pay later
                    </label>

                    {!payLater && (
                      <>
                        <Label>Payment mode</Label>
                        <div className="book-payment__modes">
                          {PAYMENT_MODES.map((m) => (
                            <button
                              key={m}
                              type="button"
                              className={`book-payment__mode-btn ${paymentMode === m ? 'book-payment__mode-btn--active' : ''}`}
                              onClick={() => {
                                setPaymentMode(m);
                                if (!requiresTransactionReference(m)) setPaymentRef('');
                              }}
                            >
                              {m}
                            </button>
                          ))}
                        </div>
                        <Input
                          label="Amount received (₹)"
                          type="number"
                          min={0}
                          max={grandTotal}
                          step="0.01"
                          value={amountReceived}
                          onChange={(e) => setAmountReceived(e.target.value)}
                        />
                        {requiresTransactionReference(paymentMode) && (
                          <Input
                            label="Transaction / reference no."
                            value={paymentRef}
                            onChange={(e) => setPaymentRef(e.target.value)}
                            placeholder="e.g. UPI ref or card auth code"
                          />
                        )}
                      </>
                    )}
                  </div>
                </div>
              </section>
            )}

            <footer className="book-form__footer">
              <Button
                type="submit"
                className="btn--block book-form__submit"
                size="lg"
                disabled={
                  !time
                  || isSaving
                  || (!payLater && grandTotal > 0 && (Number(amountReceived) || 0) < grandTotal)
                }
              >
                {isSaving
                  ? 'Saving...'
                  : payLater
                    ? 'Confirm booking'
                    : 'Pay & confirm booking'}
              </Button>
            </footer>
          </form>
        </div>
      </div>
    </QueryFeedback>
  );
}

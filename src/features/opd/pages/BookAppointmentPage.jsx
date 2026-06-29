import { useMemo, useState, useCallback, useEffect } from 'react';

import { Link, useNavigate } from 'react-router-dom';

import { ArrowLeft, CheckCircle2, AlertCircle, Clock, Stethoscope } from 'lucide-react';

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

import { REGISTRATION_FEE, REVISIT_DAYS, ROUTES, TAX_RATE, PAYMENT_MODES } from '@/shared/constants';

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
    validateAppointment
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
    isError: slotsError,
  } = useDoctorSlotsQuery({
    doctorId,
    departmentId: deptId,
    date: dateStr,
    enabled: Boolean(dateStr && doctorId && deptId),
  });

  const revisit = getRevisitInfoFromVisits(profileVisits);



  const patientOptions = useMemo(
    () =>
      bookablePatients.map((p) => ({
        value: p.id,
        label: p.name,
        sublabel: p.phone,
        badge: p.id,
        searchText: `${p.id} ${p.name} ${p.phone}`.toLowerCase(),
      })),
    [bookablePatients],
  );

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
    const deptHistory = [...new Set(profileVisits.map((v) => v.department).filter(Boolean))];
    return {
      last: last
        ? { date: last.visitDate, deptName: last.department, doctorName: last.doctorName }
        : null,
      deptHistory,
      totalVisits: profileVisits.length,
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



  return (

    <QueryFeedback isLoading={isLoading || loadingScheduledAppts} isError={isError} error={error}>

      <div className="book-appointment book-appointment-page page-container page-stack">

        <div className="book-appointment-page__toolbar">
          <Button variant="outline" size="sm" type="button" onClick={() => navigate(ROUTES.APPOINTMENTS)}>
            <ArrowLeft size={16} aria-hidden /> Back
          </Button>
        </div>

        <div className="card card__body">

          <form onSubmit={onSubmit} className="book-form">

            <div className="form-section">

              <Label>Search Patient *</Label>

              <p className="form-hint">
                Search by Patient ID, name, or phone. Patients with an active appointment are hidden — use
                {' '}
                <Link to={ROUTES.APPOINTMENTS}>Appointments</Link>
                {' '}
                to reschedule.
              </p>

              <SearchableSelect
                options={patientOptions}
                value={patientId}
                onSearchChange={setPatientSearch}
                onChange={handlePatientSelectChange}
                placeholder="Type ID, name or phone..."
                clearOnEmptyBlur
                error={errors.patientId}
              />

            </div>



            {selectedPatient && (

              <div className="patient-context-panel">

                <div className="patient-identity-grid">
                  <div className="patient-identity-col">
                    <span className="patient-identity-col__label">Name</span>
                    <strong className="patient-identity-col__value">{selectedPatient.name}</strong>
                  </div>
                  <div className="patient-identity-col">
                    <span className="patient-identity-col__label">Patient ID</span>
                    <span className="patient-identity-col__value id-badge">{selectedPatient.id}</span>
                  </div>
                  <div className="patient-identity-col">
                    <span className="patient-identity-col__label">Phone Number</span>
                    <span className="patient-identity-col__value">{selectedPatient.phone}</span>
                  </div>
                </div>



                <div className="revisit-status-row">

                  {revisitStatus === 'valid' && (

                    <span className="badge-pill badge-pill--success">

                      <CheckCircle2 size={12} /> Revisit valid — no registration fee

                    </span>

                  )}

                  {revisitStatus === 'expired' && (

                    <span className="badge-pill badge-pill--warning">

                      <AlertCircle size={12} /> Registration fee applicable

                    </span>

                  )}

                  {revisitStatus === 'new' && (

                    <span className="badge-pill badge-pill--info">

                      <AlertCircle size={12} /> First visit — registration fee applies

                    </span>

                  )}

                </div>



                <div className="patient-context-grid">

                  <div className="context-item">

                    <Clock size={14} />

                    <div>

                      <label>Last Visit</label>

                      <span>

                        {patientHistory?.last

                          ? `${patientHistory.last.date} · ${patientHistory.last.deptName}`

                          : 'No completed visits'}

                      </span>

                    </div>

                  </div>

                  <div className="context-item">

                    <Stethoscope size={14} />

                    <div>

                      <label>Previous Doctor</label>

                      <span>{patientHistory?.last?.doctorName || '—'}</span>

                    </div>

                  </div>

                </div>



                {revisit.daysSince != null && (

                  <div

                    className={`revisit-banner ${

                      revisit.isRevisit ? 'revisit-banner--ok' : 'revisit-banner--warn'

                    }`}

                  >

                    {revisit.isRevisit ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}

                    <p>

                      {revisit.isRevisit

                        ? `Within ${REVISIT_DAYS}-day revisit window (${revisit.daysSince} days since last visit).`

                        : `Revisit window expired (${revisit.daysSince} days). Registration fee of ${formatCurrency(REGISTRATION_FEE)} will apply.`}

                    </p>

                  </div>

                )}

              </div>

            )}



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

                      label: `Dr. ${d.name}`,

                      sublabel: `${d.specialization} — ${formatCurrency(d.fee)}`,

                    }))}

                  value={doctorId}

                  onChange={handleDoctorSelectChange}

                  disabled={!deptId}

                  error={errors.doctorId}

                />

              </div>

            </div>



            {selectedDoctor && (

              <div className="fee-box">

                {revisit.registrationFeeApplicable && (

                  <p>Registration: {formatCurrency(REGISTRATION_FEE)}</p>

                )}

                <p>Consultation: {formatCurrency(selectedDoctor.fee)}</p>

                <p className="fee-box__total">
                  Estimated: {formatCurrency(grandTotal)}
                </p>
              </div>
            )}

            {selectedDoctor && (
              <div className="book-form__payment">
                <label className="book-form__pay-later">
                  <input
                    type="checkbox"
                    checked={payLater}
                    onChange={(e) => setPayLater(e.target.checked)}
                  />
                  Pay later (appointment will show as Pending / Unpaid)
                </label>

                {!payLater && (
                  <>
                    <Label>Payment Mode</Label>
                    <div className="book-form__mode-buttons">
                      {PAYMENT_MODES.map((m) => (
                        <button
                          key={m}
                          type="button"
                          className={`book-form__mode-btn ${paymentMode === m ? 'book-form__mode-btn--active' : ''}`}
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
                      label="Amount Received (₹)"
                      type="number"
                      min={0}
                      max={grandTotal}
                      step="0.01"
                      value={amountReceived}
                      onChange={(e) => setAmountReceived(e.target.value)}
                    />
                    {requiresTransactionReference(paymentMode) && (
                      <Input
                        label="Transaction / Reference No"
                        value={paymentRef}
                        onChange={(e) => setPaymentRef(e.target.value)}
                        placeholder="e.g. UPI ref or card auth code"
                      />
                    )}
                  </>
                )}
              </div>
            )}

            <div className="form-grid book-form__date-reason">
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
                label="Reason for Visit"
                value={reason}
                placeholder="Brief reason (optional)"
                onChange={(e) => set('reason', e.target.value)}
              />
            </div>

            {dateStr && doctorId && (
              <div className="slot-section slot-section--compact">
                <Label>Time Slot *</Label>
                <TimeSlotGrid
                  className="time-slot-grid--compact"
                  date={new Date(dateStr)}
                  doctorId={doctorId}
                  departmentId={deptId}
                  selectedTime={time}
                  onSelectTime={(t) => set('time', t)}
                  apiSlots={apiSlots}
                  useApiSlots
                  slotsLoading={slotsLoading}
                  slotsError={slotsError}
                />
              </div>
            )}

            <Button
              type="submit"
              className="btn--block"
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
                  ? 'Confirm Booking (Pay Later)'
                  : 'Pay & Confirm Booking'}
            </Button>

          </form>

        </div>

      </div>

    </QueryFeedback>

  );

}


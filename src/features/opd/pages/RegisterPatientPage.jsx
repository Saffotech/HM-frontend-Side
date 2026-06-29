import { CalendarDays, Clock, FileText } from 'lucide-react';
import {
  useDepartmentsQuery,
  useDoctorsByDepartmentQuery,
} from '@/shared/hooks/queries/useOpdReferenceQuery';
import { useDoctorSlotsQuery } from '@/shared/hooks/queries/useAppointmentQuery';
import { BLOOD_GROUPS, GENDERS, REGISTRATION_FEE, ROUTES } from '@/shared/constants';
import {
  Button,
  Input,
  Label,
  Select,
  Textarea,
  MoneyAmount,
  TimeSlotGrid,
} from '@/shared/components/common';
import {
  formatAadhaarInput,
  formatPhoneInput,
} from '@/shared/utils/validators';
import { formatPersonName } from '@/shared/utils/formatPersonName';
import { formatCurrency } from '@/shared/utils/formatCurrency';
import { formatAppointmentDisplay, todayIso } from '@/features/opd/utils/registerPatientUtils';
import { useRegisterPatientFlow } from '@/features/opd/hooks/useRegisterPatientFlow';
import RegisterPatientStepIndicator from '@/features/opd/components/register/RegisterPatientStepIndicator';
import RegisterPatientBillModal from '@/features/opd/components/register/RegisterPatientBillModal';
import RegisterPatientSuccessModal from '@/features/opd/components/register/RegisterPatientSuccessModal';
import './RegisterPatientPage.css';

export default function RegisterPatientPage() {
  const flow = useRegisterPatientFlow();
  const {
    form,
    errors,
    set,
    stage,
    setStage,
    billPreview,
    paymentAmount,
    setPaymentAmount,
    paymentMode,
    paymentRef,
    paymentRefError,
    setPaymentRef,
    setPaymentRefError,
    appointmentDateStr,
    setAppointmentDateStr,
    appointmentTime,
    setAppointmentTime,
    successData,
    existingPatient,
    setExistingPatient,
    revisitConfirmed,
    setRevisitConfirmed,
    isRevisitPatient,
    isSaving,
    handlePhoneBlur,
    resetAppointmentSlot,
    handleDoctorChange,
    getOnSubmit,
    confirmPayment,
    handlePaymentModeChange,
    navigate,
  } = flow;

  const { data: departments = [] } = useDepartmentsQuery();
  const { data: doctors = [] } = useDoctorsByDepartmentQuery(form.deptId);
  const selectedDoctor = doctors.find((d) => String(d.id) === String(form.doctorId));
  const selectedDept = departments.find((d) => String(d.id) === String(form.deptId));

  const {
    data: apiSlots = [],
    isLoading: slotsLoading,
    isError: slotsError,
  } = useDoctorSlotsQuery({
    doctorId: form.doctorId,
    departmentId: form.deptId,
    date: appointmentDateStr,
    enabled: Boolean(appointmentDateStr && form.doctorId && form.deptId),
  });

  const feeTotal = selectedDoctor
    ? REGISTRATION_FEE + selectedDoctor.fee + Math.round((REGISTRATION_FEE + selectedDoctor.fee) * 0.05)
    : 0;

  const appointmentDateObj = appointmentDateStr
    ? new Date(`${appointmentDateStr}T12:00:00`)
    : null;

  return (
    <div className="register-patient register-patient-page page-container">
        <RegisterPatientStepIndicator stage={stage} />
        <h2 className="page-title">Register New Patient</h2>
        <div className="card card__body">
          <form onSubmit={getOnSubmit(selectedDoctor)} className="register-form">
            <div className="form-grid">
              <Input
                label="Full Name"
                value={form.name}
                onChange={(e) => set('name', formatPersonName(e.target.value))}
                error={errors.name}
              />
              <Select
                label="Gender"
                value={form.gender}
                onChange={(v) => set('gender', v)}
                options={GENDERS.map((g) => ({ value: g, label: g }))}
              />
              <Input
                label="Phone"
                value={form.phone}
                onChange={(e) => {
                  set('phone', formatPhoneInput(e.target.value));
                  if (existingPatient) setExistingPatient(null);
                  if (revisitConfirmed) setRevisitConfirmed(false);
                }}
                onBlur={handlePhoneBlur}
                error={errors.phone}
              />
              {existingPatient?.found && existingPatient?.patient && !revisitConfirmed && (
                <div className="register-revisit-hint">
                  <p>
                    A patient with this phone is on file:{' '}
                    <strong>{existingPatient.patient.name}</strong> ({existingPatient.patient.id}).
                    Duplicate detection uses Aadhaar — you can still register a new patient with a
                    different Aadhaar.
                  </p>
                  <Button type="button" variant="outline" size="sm" onClick={() => setRevisitConfirmed(true)}>
                    Record as revisit for this patient
                  </Button>
                </div>
              )}
              {isRevisitPatient && existingPatient?.patient && (
                <p className="register-revisit-hint register-revisit-hint--active">
                  Revisit for <strong>{existingPatient.patient.name}</strong> (
                  {existingPatient.patient.id}) — registration fee waived.{' '}
                  <button
                    type="button"
                    className="register-revisit-hint__cancel"
                    onClick={() => setRevisitConfirmed(false)}
                  >
                    Cancel revisit
                  </button>
                </p>
              )}
              <Input
                type="date"
                label="Date of Birth"
                value={form.dob}
                onChange={(e) => set('dob', e.target.value)}
                error={errors.dob}
              />
              <div className="register-form__blood-address-row form-grid--full">
                <div className="register-form__blood-group">
                  <Select
                    label="Blood Group"
                    value={form.bloodGroup}
                    onChange={(v) => set('bloodGroup', v)}
                    options={[
                      { value: '', label: 'None' },
                      ...BLOOD_GROUPS.map((b) => ({ value: b, label: b })),
                    ]}
                  />
                </div>
                <Textarea
                  label="Address"
                  value={form.address}
                  onChange={(e) => set('address', e.target.value)}
                  rows={1}
                />
              </div>
              <Input label="State" value={form.state} onChange={(e) => set('state', e.target.value)} />
              <Input
                label="Aadhaar"
                value={form.aadhaar}
                onChange={(e) => set('aadhaar', formatAadhaarInput(e.target.value))}
                placeholder="XXXX-XXXX-XXXX"
                error={errors.aadhaar}
                required={!isRevisitPatient}
              />
            </div>

            <hr />
            <h3>Department & Doctor</h3>
            <div className="form-grid">
              <Select
                label="Department"
                value={form.deptId}
                onChange={(v) => {
                  set('deptId', v);
                  set('doctorId', '');
                  resetAppointmentSlot();
                }}
                options={departments.map((d) => ({ value: d.id, label: d.name }))}
              />
              <Select
                label="Doctor"
                value={form.doctorId}
                onChange={handleDoctorChange}
                disabled={!form.deptId}
                options={doctors.map((d) => ({ value: d.id, label: `Dr. ${d.name} — ₹${d.fee}` }))}
              />
            </div>

            {selectedDoctor && (
              <div className="register-booking">
                <div className="fee-box fee-box--compact">
                  <p className="fee-box__line">
                    Registration: {formatCurrency(REGISTRATION_FEE)} + Consultation:{' '}
                    {formatCurrency(selectedDoctor.fee)}
                  </p>
                  <p className="fee-box__total">
                    Estimated Total: <MoneyAmount amount={feeTotal} strong />
                  </p>
                </div>

                <section className="register-appointment" aria-labelledby="register-appointment-title">
                  <div className="register-appointment__header">
                    <CalendarDays size={18} className="register-appointment__icon" aria-hidden />
                    <div className="register-appointment__header-text">
                      <h3 id="register-appointment-title">Appointment with Dr. {selectedDoctor.name}</h3>
                      <p className="register-appointment__hint">
                        Booked automatically when you complete registration.
                      </p>
                    </div>
                  </div>

                  <div className="register-appointment__controls">
                    <Input
                      type="date"
                      label="Appointment Date *"
                      value={appointmentDateStr}
                      onChange={(e) => {
                        setAppointmentDateStr(e.target.value);
                        setAppointmentTime('');
                      }}
                      min={todayIso()}
                      className="register-appointment__date"
                    />
                    {appointmentTime && (
                      <p className="register-appointment__selected">
                        <Clock size={14} aria-hidden />
                        Selected: <strong>{appointmentTime}</strong>
                      </p>
                    )}
                  </div>

                  {appointmentDateStr && (
                    <div className="register-appointment__slots">
                      <div className="register-appointment__slots-head">
                        <Label>Available Time Slots *</Label>
                        <span className="register-appointment__date-label text-muted">
                          {formatAppointmentDisplay(appointmentDateStr)}
                        </span>
                      </div>
                      <TimeSlotGrid
                        date={appointmentDateObj}
                        doctorId={form.doctorId}
                        departmentId={form.deptId}
                        selectedTime={appointmentTime}
                        onSelectTime={setAppointmentTime}
                        apiSlots={apiSlots}
                        useApiSlots
                        slotsLoading={slotsLoading}
                        slotsError={slotsError}
                      />
                    </div>
                  )}
                </section>
              </div>
            )}

            <Button
              type="submit"
              disabled={!selectedDoctor || !appointmentTime || isSaving}
              className="btn--block"
              size="lg"
            >
              <FileText size={18} /> {isSaving ? 'Saving...' : 'Generate Bill'}
            </Button>
          </form>
        </div>

        <RegisterPatientBillModal
          isOpen={stage === 'bill'}
          billPreview={billPreview}
          paymentAmount={paymentAmount}
          paymentMode={paymentMode}
          paymentRef={paymentRef}
          paymentRefError={paymentRefError}
          isSaving={isSaving}
          onClose={() => setStage('form')}
          onPaymentAmountChange={setPaymentAmount}
          onPaymentModeChange={handlePaymentModeChange}
          onPaymentRefChange={(value) => {
            setPaymentRef(value);
            if (paymentRefError) setPaymentRefError('');
          }}
          onConfirm={() => confirmPayment(selectedDoctor, selectedDept)}
        />

        <RegisterPatientSuccessModal
          isOpen={stage === 'success'}
          successData={successData}
          onClose={() => navigate(ROUTES.PATIENTS)}
        />
      </div>
  );
}

import { AlertTriangle } from 'lucide-react';
import { Label, SearchableSelect } from '@/shared/components/common';
import { formatCurrency } from '@/shared/utils/formatCurrency';
import { patientAgeYears } from '@/features/opd/billing/utils/opdBillContextUtils';
import OpdBillBillingContextPanel from '@/features/opd/billing/components/OpdBillBillingContextPanel';
import OpdBillExistingBillAlert from '@/features/opd/billing/components/OpdBillExistingBillAlert';

function ContextField({ label, children }) {
  if (children == null || children === '') return null;
  return (
    <div>
      <span>{label}:</span> <strong>{children}</strong>
    </div>
  );
}

export default function OpdBillPatientSection({
  patientOptions,
  patientId,
  onPatientChange,
  onPatientSearchChange,
  patientSearchSynced = false,
  fieldErrors,
  selectedPatient,
  service,
  billAppointment,
  patientApptsFetched,
  serviceReady,
  departments = [],
  doctors = [],
  deptId,
  doctorId,
  onDeptChange,
  onDoctorChange,
  billingContext,
  duplicateBills,
  existingBillAcknowledged,
  onAcknowledgeExistingBill,
  onOpenBill,
  onOpenOutstanding,
}) {
  const age = patientAgeYears(selectedPatient);
  const gender = selectedPatient?.gender;
  const phone = selectedPatient?.phone;
  const bloodGroup = selectedPatient?.bloodGroup;
  const appointmentLabel =
    billAppointment?.date && billAppointment?.time
      ? `${billAppointment.date} at ${billAppointment.time}`
      : billAppointment?.date || billAppointment?.time || null;

  const showExistingWarning =
    Boolean(billingContext?.openTodayCount) ||
    Boolean(billingContext?.appointmentHasBill) ||
    (duplicateBills?.length ?? 0) > 0;

  return (
    <>
      <div className="field-block">
        <Label>Select Patient *</Label>
        <SearchableSelect
          options={patientOptions}
          value={patientId}
          onChange={onPatientChange}
          onSearchChange={onPatientSearchChange}
          serverFiltered={patientSearchSynced}
          placeholder="Search by name, phone, or Patient ID..."
          className="max-w-lg"
          clearOnEmptyBlur
          error={fieldErrors.patientId}
        />
        {fieldErrors.amount && (
          <span className="field__error">{fieldErrors.amount}</span>
        )}
      </div>

      {selectedPatient && (
        <>
          <div className="patient-info-card">
            <div className="patient-info-card__avatar">
              {(selectedPatient.name || '?').charAt(0)}
            </div>
            <div className="patient-info-card__grid">
              <ContextField label="Name">{selectedPatient.name}</ContextField>
              <ContextField label="Patient ID">{selectedPatient.id}</ContextField>
              {age != null ? <ContextField label="Age">{age}</ContextField> : null}
              {gender ? <ContextField label="Gender">{gender}</ContextField> : null}
              {phone ? <ContextField label="Phone">{phone}</ContextField> : null}
              {bloodGroup ? (
                <div>
                  <span>Blood:</span>{' '}
                  <strong className="text-red">{bloodGroup}</strong>
                </div>
              ) : null}
              <ContextField label="Doctor">{service?.doctorName}</ContextField>
              <ContextField label="Department">{service?.deptName}</ContextField>
              <ContextField label="Appointment">{appointmentLabel}</ContextField>
            </div>
          </div>

          <OpdBillBillingContextPanel
            billingContext={billingContext}
            onOpenOutstanding={onOpenOutstanding}
            onOpenBill={onOpenBill}
          />

          {selectedPatient && !patientApptsFetched && (
            <p className="opd-bill__service-hint text-muted">Loading appointment details…</p>
          )}
          {selectedPatient && patientApptsFetched && !serviceReady && (
            <>
              <div className="opd-alert opd-alert--warn" role="status">
                <AlertTriangle size={18} aria-hidden />
                <span>
                  No scheduled appointment for this patient. Select department and doctor below to
                  generate a bill.
                </span>
              </div>
              <div className="form-grid opd-bill__service-fields">
                <div className="field-block">
                  <Label>Department *</Label>
                  <SearchableSelect
                    options={departments.map((d) => ({ value: String(d.id), label: d.name }))}
                    value={deptId}
                    onChange={onDeptChange}
                    placeholder="Select department..."
                    className="max-w-lg"
                  />
                </div>
                <div className="field-block">
                  <Label>Doctor *</Label>
                  <SearchableSelect
                    options={doctors
                      .filter((d) => !deptId || String(d.deptId) === String(deptId))
                      .map((d) => ({
                        value: String(d.id),
                        label: d.name.startsWith('Dr.') ? d.name : `Dr. ${d.name}`,
                        sublabel: d.specialization
                          ? `${d.specialization} — ${formatCurrency(d.fee)}`
                          : formatCurrency(d.fee),
                      }))}
                    value={doctorId}
                    onChange={onDoctorChange}
                    disabled={!deptId}
                    placeholder="Select doctor..."
                    className="max-w-lg"
                  />
                </div>
              </div>
            </>
          )}

          {showExistingWarning ? (
            <OpdBillExistingBillAlert
              billingContext={billingContext}
              duplicateBills={duplicateBills}
              acknowledged={existingBillAcknowledged}
              onAcknowledge={onAcknowledgeExistingBill}
              onOpenBill={onOpenBill}
            />
          ) : null}
        </>
      )}
    </>
  );
}

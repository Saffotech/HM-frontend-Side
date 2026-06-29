import { AlertTriangle } from 'lucide-react';
import { Label, SearchableSelect, TablePagination } from '@/shared/components/common';

const PATIENT_PAGE_SIZE = 20;

export default function OpdBillPatientSection({
  patientOptions,
  patientId,
  onPatientChange,
  onPatientSearchChange,
  patientPageMeta,
  onPatientPageChange,
  fieldErrors,
  selectedPatient,
  service,
  billAppointment,
  patientApptsFetched,
  serviceReady,
  openBillToday,
}) {
  return (
    <>
      <div className="field-block">
        <Label>Select Patient *</Label>
        <SearchableSelect
          options={patientOptions}
          value={patientId}
          onChange={onPatientChange}
          onSearchChange={onPatientSearchChange}
          placeholder="Search patient..."
          className="max-w-lg"
          clearOnEmptyBlur
          error={fieldErrors.patientId}
        />
        <TablePagination
          page={patientPageMeta.page}
          totalPages={patientPageMeta.totalPages}
          totalItems={patientPageMeta.total}
          pageSize={PATIENT_PAGE_SIZE}
          onPageChange={onPatientPageChange}
        />
        {fieldErrors.amount && (
          <span className="field__error">{fieldErrors.amount}</span>
        )}
      </div>

      {selectedPatient && (
        <>
          <div className="patient-info-card">
            <div className="patient-info-card__avatar">{selectedPatient.name.charAt(0)}</div>
            <div className="patient-info-card__grid">
              <div>
                <span>Name:</span> <strong>{selectedPatient.name}</strong>
              </div>
              <div>
                <span>ID:</span> <strong>{selectedPatient.id}</strong>
              </div>
              <div>
                <span>Phone:</span> <strong>{selectedPatient.phone}</strong>
              </div>
              <div>
                <span>Blood:</span>{' '}
                <strong className="text-red">{selectedPatient.bloodGroup}</strong>
              </div>
              {service?.doctorName && (
                <div>
                  <span>Doctor:</span> <strong>{service.doctorName}</strong>
                </div>
              )}
              {service?.deptName && (
                <div>
                  <span>Department:</span> <strong>{service.deptName}</strong>
                </div>
              )}
              {billAppointment?.date && billAppointment?.time && (
                <div>
                  <span>Appointment:</span>{' '}
                  <strong>
                    {billAppointment.date} at {billAppointment.time}
                  </strong>
                </div>
              )}
            </div>
          </div>

          {selectedPatient && !patientApptsFetched && (
            <p className="opd-bill__service-hint text-muted">Loading appointment details…</p>
          )}
          {selectedPatient && patientApptsFetched && !serviceReady && (
            <div className="opd-alert opd-alert--warn" role="status">
              <AlertTriangle size={18} aria-hidden />
              <span>
                No scheduled appointment for this patient. Book an appointment before generating
                a bill.
              </span>
            </div>
          )}

          {openBillToday && (
            <div className="opd-alert opd-alert--warn" role="status">
              <AlertTriangle size={18} aria-hidden />
              <span>
                This patient already has an unpaid or partial bill for today. You can still create
                another bill if needed.
              </span>
            </div>
          )}
        </>
      )}
    </>
  );
}

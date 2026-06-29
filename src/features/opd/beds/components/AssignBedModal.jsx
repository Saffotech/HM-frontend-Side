import { useState, useEffect } from 'react';
import { BedDouble, Building2, Calendar, FileText, CheckCircle2 } from 'lucide-react';
import { usePatientsQuery, usePatientQuery, usePatientProfileQuery } from '@/shared/hooks/queries/usePatientQuery';
import { asPatientList, asPatientPageMeta } from '@/shared/hooks/queries/listDataUtils';
import { useBedsQuery, useAssignBedMutation } from '@/shared/hooks/queries/useBedsQuery';
import { useDepartmentsQuery } from '@/shared/hooks/queries/useOpdReferenceQuery';
import { opdReferenceApi } from '@/shared/api/services';
import { WARDS } from '@/shared/constants';
import { toast } from '@/shared/utils/toast';
import { trimForm } from '@/shared/utils/trimForm';
import { useFormValidation } from '@/shared/hooks/useFormValidation';
import {
  Modal,
  Button,
  Input,
  Select,
  Avatar,
  TablePagination,
} from '@/shared/components/common';
import './AssignBedModal.css';

const PATIENT_PAGE_SIZE = 20;

function validateAssignBed(values) {
  const errors = {};
  if (!values.patientId) errors.patientId = 'Patient is required';
  if (!values.ward) errors.ward = 'Ward is required';
  if (!values.bedNo) errors.bedNo = 'Bed is required';
  if (!values.date) errors.date = 'Admission date is required';
  return errors;
}

const initialValues = {
  patientId: '',
  ward: 'General',
  bedNo: '',
  date: new Date().toISOString().split('T')[0],
  notes: '',
};

export default function AssignBedModal({ open, onClose, defaultBed = null }) {
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [open]);

  const { data: patientsData } = usePatientsQuery({
    fetchAll: false,
    page,
    limit: PATIENT_PAGE_SIZE,
    enabled: open,
  });
  const patients = asPatientList(patientsData);
  const pageMeta = asPatientPageMeta(patientsData);
  const { data: departments = [] } = useDepartmentsQuery();
  const { data: bedData } = useBedsQuery();
  const beds = bedData?.beds ?? [];
  const assignBed = useAssignBedMutation();
  const { values, errors, handleChange, handleSubmit, setValues } = useFormValidation(
    initialValues,
    validateAssignBed
  );

  const { patientId, ward, bedNo, date, notes } = values;
  const set = (key, val) => handleChange(key, val);

  const { data: patientDetail } = usePatientQuery(patientId);
  const selectedPatient =
    patients.find((p) => p.id === patientId) ?? patientDetail ?? null;
  const profileDbId = open && selectedPatient?.dbId ? selectedPatient.dbId : null;
  const { data: patientProfile } = usePatientProfileQuery(profileDbId);
  const registrationDeptName =
    opdReferenceApi.findDepartment(departments, selectedPatient?.deptId)?.name ??
    patientProfile?.visits?.[0]?.department ??
    null;
  const resolvePatientDepartment = (patient, profile) => {
    const fromId = opdReferenceApi.findDepartment(departments, patient?.deptId);
    if (fromId) return fromId;
    const visitDept = profile?.visits?.[0]?.department;
    if (!visitDept) return null;
    return (
      departments.find((d) => d.name?.toLowerCase() === visitDept.toLowerCase()) ?? null
    );
  };
  const availableBeds = beds.filter((b) => b.ward === ward && b.status === 'Available');
  const readyToSubmit = patientId && ward && bedNo && date;

  useEffect(() => {
    if (!open) return;
    const today = new Date().toISOString().split('T')[0];
    if (defaultBed?.ward && defaultBed?.bedNo) {
      setValues({
        ...initialValues,
        ward: defaultBed.ward,
        bedNo: defaultBed.bedNo,
        date: today,
      });
      return;
    }
    setValues({ ...initialValues, date: today });
  }, [open, defaultBed?.ward, defaultBed?.bedNo, setValues]);

  const resetForm = () => {
    setValues({ ...initialValues, date: new Date().toISOString().split('T')[0] });
    setPage(1);
  };

  const onSubmit = handleSubmit((rawValues) => {
    const trimmed = trimForm(rawValues);
    const patient =
      patients.find((p) => p.id === trimmed.patientId) ?? patientDetail;
    const dept = resolvePatientDepartment(patient, patientProfile);
    const selectedBed = availableBeds.find((b) => b.bedNo === trimmed.bedNo);
    if (!patient?.dbId || !selectedBed?.dbId) {
      toast.error('Missing patient or bed record. Refresh and try again.');
      return;
    }
    assignBed.mutate(
      {
        bed_id: selectedBed.dbId,
        patient_id: patient.dbId,
        department_id: dept?.dbId ?? dept?.id,
      },
      {
        onSuccess: () => {
          toast.success(`Bed ${trimmed.bedNo} assigned to ${patient.name}`);
          resetForm();
          onClose();
        },
      }
    );
  });

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title=""
      size="md"
      panelClassName="modal--assign-bed"
      footer={
        <div className="assign-bed-modal__footer">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={assignBed.isPending || !readyToSubmit}
            onClick={onSubmit}
            className="assign-bed-modal__submit"
          >
            <CheckCircle2 size={16} aria-hidden />
            {assignBed.isPending ? 'Assigning...' : 'Confirm Assignment'}
          </Button>
        </div>
      }
    >
      <div className="assign-bed-modal__hero">
        <div className="assign-bed-modal__hero-icon" aria-hidden>
          <BedDouble size={22} strokeWidth={2} />
        </div>
        <div>
          <h2 className="assign-bed-modal__title">Assign Bed</h2>
          <p className="assign-bed-modal__subtitle">Link a patient to an available bed</p>
        </div>
        <button
          type="button"
          className="assign-bed-modal__close"
          onClick={onClose}
          aria-label="Close"
        >
          ×
        </button>
      </div>

      <form onSubmit={onSubmit} className="assign-bed-form">
        <section className="assign-bed-section">
          <Select
            label="Select patient"
            value={patientId}
            onChange={(v) => set('patientId', v)}
            placeholder="Search patient by name or ID..."
            options={patients.map((p) => ({
              value: p.id,
              label: `${p.id} — ${p.name}`,
            }))}
          />
          {errors.patientId && <span className="field__error">{errors.patientId}</span>}
          <TablePagination
            page={pageMeta.page}
            totalPages={pageMeta.totalPages}
            totalItems={pageMeta.total}
            pageSize={PATIENT_PAGE_SIZE}
            onPageChange={setPage}
          />

          {selectedPatient && (
            <div className="assign-bed-patient-card">
              <Avatar name={selectedPatient.name} />
              <div className="assign-bed-patient-card__meta">
                <strong>{selectedPatient.name}</strong>
                <span className="assign-bed-patient-card__id">{selectedPatient.id}</span>
                {registrationDeptName && (
                  <span className="assign-bed-patient-card__dept">{registrationDeptName}</span>
                )}
              </div>
            </div>
          )}
        </section>

        <section className="assign-bed-section">
          <h3 className="assign-bed-section__title">
            <Building2 size={16} aria-hidden />
            Ward &amp; bed
          </h3>
          <div className="assign-bed-form__row">
            <div className="assign-bed-form__col">
              <Select
                label="Ward"
                value={ward}
                onChange={(v) => {
                  set('ward', v);
                  set('bedNo', '');
                }}
                options={WARDS.map((w) => ({ value: w, label: w }))}
              />
              {errors.ward && <span className="field__error">{errors.ward}</span>}
            </div>
            <div className="assign-bed-form__col">
              <Select
                label="Bed number"
                value={bedNo}
                onChange={(v) => set('bedNo', v)}
                disabled={!ward}
                placeholder={availableBeds.length === 0 ? 'No beds free' : 'Select bed...'}
                options={availableBeds.map((b) => ({ value: b.bedNo, label: b.bedNo }))}
              />
              {errors.bedNo && <span className="field__error">{errors.bedNo}</span>}
            </div>
          </div>
          {ward && (
            <p className="assign-bed-availability">
              <span
                className={
                  availableBeds.length > 0
                    ? 'assign-bed-availability__chip assign-bed-availability__chip--ok'
                    : 'assign-bed-availability__chip assign-bed-availability__chip--none'
                }
              >
                {availableBeds.length} bed{availableBeds.length === 1 ? '' : 's'} available in{' '}
                {ward}
              </span>
            </p>
          )}
        </section>

        <section className="assign-bed-section assign-bed-section--last">
          <h3 className="assign-bed-section__title">
            <Calendar size={16} aria-hidden />
            Admission details
          </h3>
          <Input
            label="Admission date"
            type="date"
            value={date}
            onChange={(e) => set('date', e.target.value)}
            error={errors.date}
          />
          <Input
            id="assign-bed-notes"
            label={
              <span className="assign-bed-notes-label">
                <FileText size={14} strokeWidth={2} aria-hidden />
                Notes (optional)
              </span>
            }
            value={notes}
            onChange={(e) => set('notes', e.target.value)}
            placeholder="Special instructions for nursing staff..."
          />
        </section>

        {readyToSubmit && (
          <div className="assign-bed-summary" role="status">
            <CheckCircle2 size={18} aria-hidden />
            <p>
              Assign <strong>{bedNo}</strong> in <strong>{ward}</strong> to{' '}
              <strong>{selectedPatient?.name}</strong>
            </p>
          </div>
        )}
      </form>
    </Modal>
  );
}

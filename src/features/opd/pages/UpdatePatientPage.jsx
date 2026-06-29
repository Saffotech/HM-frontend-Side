import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { usePatientQuery, useUpdatePatientMutation } from '@/shared/hooks/queries/usePatientQuery';
import { BLOOD_GROUPS, GENDERS } from '@/shared/constants';
import { Button, Input, Select, Textarea, QueryFeedback } from '@/shared/components/common';
import { formatAadhaarInput, formatPhoneInput } from '@/shared/utils/validators';
import { trimForm } from '@/shared/utils/trimForm';
import { useFormValidation } from '@/shared/hooks/useFormValidation';
import { toast } from '@/shared/utils/toast';
import './UpdatePatientPage.css';

function validateUpdatePatient(values) {
  const errors = {};
  if (!values.name?.trim()) errors.name = 'Name is required';
  const phone = (values.phone || '').replace(/\s/g, '');
  if (!/^\d{10}$/.test(phone)) errors.phone = 'Phone must be 10 digits';
  if (!values.gender) errors.gender = 'Gender is required';
  if (!values.bloodGroup) errors.bloodGroup = 'Blood group is required';
  return errors;
}

export default function UpdatePatientPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: patient, isLoading, isError, error } = usePatientQuery(id);
  const updatePatient = useUpdatePatientMutation();

  const { values: form, errors, handleChange, handleSubmit, setValues } = useFormValidation(
    {},
    validateUpdatePatient
  );

  useEffect(() => {
    if (patient) setValues({ ...patient });
  }, [patient, setValues]);

  if (isLoading || isError) {
    return <QueryFeedback isLoading={isLoading} isError={isError} error={error} />;
  }
  if (!patient) return <div className="empty-state">Patient not found</div>;

  const set = (key, val) => handleChange(key, val);

  const onSubmit = handleSubmit((rawValues) => {
    const data = trimForm(rawValues);
    updatePatient.mutate(
      { id: patient.dbId ?? id, data },
      {
        onSuccess: () => {
          toast.success('Patient updated');
          navigate(`/patients/${id}/profile`);
        },
      }
    );
  });

  return (
    <div className="page-container update-patient-page">
      <div className="page-header update-patient-page__header">
        <Button variant="outline" size="sm" onClick={() => navigate(`/patients/${id}/profile`)}>
          <ArrowLeft size={16} /> Back
        </Button>
        <span className="id-badge update-patient-page__id">{id}</span>
      </div>
      <div className="card card__body">
        <form onSubmit={onSubmit}>
          <div className="form-grid">
            <Input label="Full Name" value={form.name || ''} onChange={(e) => set('name', e.target.value)} error={errors.name} />
            <Select label="Gender" value={form.gender || ''} onChange={(v) => set('gender', v)} options={GENDERS.map((g) => ({ value: g, label: g }))} />
            {errors.gender && <span className="field__error">{errors.gender}</span>}
            <Input
              label="Phone"
              value={form.phone || ''}
              onChange={(e) => set('phone', formatPhoneInput(e.target.value))}
              error={errors.phone}
            />
            <Select label="Blood Group" value={form.bloodGroup || ''} onChange={(v) => set('bloodGroup', v)} options={BLOOD_GROUPS.map((b) => ({ value: b, label: b }))} />
            {errors.bloodGroup && <span className="field__error">{errors.bloodGroup}</span>}
            <div className="form-grid--full">
              <Textarea label="Address" value={form.address || ''} onChange={(e) => set('address', e.target.value)} />
            </div>
            <Input label="State" value={form.state || ''} onChange={(e) => set('state', e.target.value)} />
            <Input label="Aadhaar" value={form.aadhaar || ''} onChange={(e) => set('aadhaar', formatAadhaarInput(e.target.value))} />
          </div>
          <div className="form-actions">
            <Button type="button" variant="outline" onClick={() => navigate(`/patients/${id}/profile`)}>Cancel</Button>
            <Button type="submit" disabled={updatePatient.isPending}>
              {updatePatient.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

import { useEffect, useMemo, useState } from 'react';
import {
  BedDouble,
  ChevronDown,
  CircleDollarSign,
  Plus,
  Save,
  Stethoscope,
  Trash2,
} from 'lucide-react';
import {
  useAdminDepartmentsQuery,
  useAdminRolesQuery,
  useAdminStaffListQuery,
} from '@/shared/hooks/queries/useAdminQuery';
import AdminEditLockToggle from '@/features/admin/components/AdminEditLockToggle';
import { Button, Input, Label } from '@/shared/components/common';

function Field({ id, label, hint, children }) {
  return (
    <div className="aos-field">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint ? <p className="aos-field__hint">{hint}</p> : null}
    </div>
  );
}

function SectionCard({
  title,
  icon: Icon,
  children,
  hint = null,
  defaultOpen = false,
  tone = 'blue',
  action = null,
  locked = false,
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section
      className={`aos-card aos-card--accordion aos-card--tone-${tone}${open ? ' is-open' : ''}${
        locked ? ' aos-card--locked' : ''
      }`}
    >
      <div className="aos-card__head aos-card__head--row">
        <button
          type="button"
          className="aos-card__head-toggle"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
        >
          <div className="aos-card__title-wrap">
            {Icon ? (
              <span className="aos-card__icon" aria-hidden>
                <Icon size={16} strokeWidth={2.2} />
              </span>
            ) : null}
            <h3 className="aos-card__title">{title}</h3>
          </div>
          <ChevronDown
            size={18}
            className={`aos-card__chevron${open ? ' is-open' : ''}`}
            aria-hidden
          />
        </button>
        {action ? <div className="aos-card__head-action">{action}</div> : null}
      </div>
      {open ? (
        <div className="aos-card__body">
          {locked ? (
            <p className="aos-locked-banner">
              Locked by Super Admin — you can view these settings but cannot change them.
            </p>
          ) : null}
          {hint ? <p className="aos-card__hint">{hint}</p> : null}
          {children}
        </div>
      ) : null}
    </section>
  );
}

function ToggleRow({ id, label, hint, checked, onChange, disabled = false }) {
  return (
    <label className="aos-toggle" htmlFor={id}>
      <span className="aos-toggle__text">
        <strong>{label}</strong>
        {hint ? <span>{hint}</span> : null}
      </span>
      <input
        id={id}
        type="checkbox"
        className="aos-toggle__input"
        checked={Boolean(checked)}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="aos-toggle__track" aria-hidden />
    </label>
  );
}

function CardSaveBar({ onSave, saving, label = 'Save', disabled = false }) {
  return (
    <div className="aos-card-save">
      <Button type="button" onClick={onSave} disabled={saving || disabled}>
        <Save size={15} />
        {saving ? 'Saving…' : label}
      </Button>
    </div>
  );
}

function doctorDisplayName(member) {
  const full = [member.first_name, member.last_name].filter(Boolean).join(' ').trim();
  return full ? `Dr. ${full}` : member.email || `Doctor #${member.id}`;
}

function upsertDepartmentFee(list, department, feeValue) {
  const next = [...(list ?? [])];
  const deptId = Number(department.id);
  const idx = next.findIndex((row) => Number(row.department_id) === deptId);
  const fee = feeValue === '' ? '' : Number(feeValue);

  if (fee === '' || !Number.isFinite(fee)) {
    if (idx >= 0) next.splice(idx, 1);
    return next;
  }
  const row = {
    department_id: deptId,
    department_name: department.name,
    fee,
  };
  if (idx >= 0) next[idx] = { ...next[idx], ...row };
  else next.push(row);
  return next;
}

function upsertDoctorFee(list, doctor, feeValue) {
  const next = [...(list ?? [])];
  const doctorId = Number(doctor.id);
  const idx = next.findIndex((row) => Number(row.doctor_id) === doctorId);
  const fee = feeValue === '' ? '' : Number(feeValue);
  const doctorName = doctorDisplayName(doctor);

  if (fee === '' || !Number.isFinite(fee)) {
    if (idx >= 0) next.splice(idx, 1);
    return next;
  }
  const row = {
    doctor_id: doctorId,
    doctor_name: doctorName,
    department_id: doctor.department_id ?? null,
    department_name: doctor.department_name || '',
    fee,
  };
  if (idx >= 0) next[idx] = { ...next[idx], ...row };
  else next.push(row);
  return next;
}

/**
 * Pricing cards — each card has its own dropdown(s) and Save button.
 */
export default function AdminOpdPricingSection({
  form,
  patch,
  setNumber,
  onSave,
  isSaving = false,
  manageAdminEditLocks = false,
  canEditGlobalFees = true,
  canEditBedTariff = true,
  canEditDeptFees = true,
  canEditDoctorFees = true,
  adminEdit = {},
  onAdminEditChange,
  adminEditSaving = false,
}) {
  const { data: departments = [] } = useAdminDepartmentsQuery({ is_active: true });
  const { data: roles = [] } = useAdminRolesQuery();
  const doctorRoleId = useMemo(
    () => roles.find((r) => r.name === 'doctor')?.id,
    [roles],
  );
  const { data: staffData } = useAdminStaffListQuery(
    {
      role_id: doctorRoleId,
      is_active: true,
      page: 1,
      limit: 100,
    },
    { enabled: Boolean(doctorRoleId) },
  );

  const doctors = useMemo(() => {
    const rows = staffData?.staff ?? staffData?.items ?? staffData?.users ?? staffData ?? [];
    return Array.isArray(rows) ? rows : [];
  }, [staffData]);

  const [selectedDeptId, setSelectedDeptId] = useState('');
  const [deptFeeDraft, setDeptFeeDraft] = useState('');
  const [doctorDeptId, setDoctorDeptId] = useState('');
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [doctorFeeDraft, setDoctorFeeDraft] = useState('');
  const [savingCard, setSavingCard] = useState(null);

  useEffect(() => {
    if (!selectedDeptId && departments.length) {
      setSelectedDeptId(String(departments[0].id));
    }
  }, [departments, selectedDeptId]);

  useEffect(() => {
    if (!doctorDeptId && departments.length) {
      setDoctorDeptId(String(departments[0].id));
    }
  }, [departments, doctorDeptId]);

  const selectedDepartment = useMemo(
    () => departments.find((d) => String(d.id) === String(selectedDeptId)) || null,
    [departments, selectedDeptId],
  );

  const doctorsInDept = useMemo(() => {
    if (!doctorDeptId) return [];
    return doctors.filter((d) => String(d.department_id) === String(doctorDeptId));
  }, [doctors, doctorDeptId]);

  useEffect(() => {
    if (!doctorsInDept.length) {
      setSelectedDoctorId('');
      return;
    }
    const stillValid = doctorsInDept.some((d) => String(d.id) === String(selectedDoctorId));
    if (!stillValid) {
      setSelectedDoctorId(String(doctorsInDept[0].id));
    }
  }, [doctorsInDept, selectedDoctorId]);

  const selectedDoctor = useMemo(
    () => doctorsInDept.find((d) => String(d.id) === String(selectedDoctorId)) || null,
    [doctorsInDept, selectedDoctorId],
  );

  useEffect(() => {
    if (!selectedDepartment) {
      setDeptFeeDraft('');
      return;
    }
    const saved = (form.pricing.department_consultation_fees ?? []).find(
      (row) => Number(row.department_id) === Number(selectedDepartment.id),
    );
    setDeptFeeDraft(saved?.fee === 0 || saved?.fee ? String(saved.fee) : '');
  }, [selectedDepartment, form.pricing.department_consultation_fees]);

  useEffect(() => {
    if (!selectedDoctor) {
      setDoctorFeeDraft('');
      return;
    }
    const saved = (form.pricing.doctor_consultation_fees ?? []).find(
      (row) => Number(row.doctor_id) === Number(selectedDoctor.id),
    );
    setDoctorFeeDraft(saved?.fee === 0 || saved?.fee ? String(saved.fee) : '');
  }, [selectedDoctor, form.pricing.doctor_consultation_fees]);

  const hospitalDefault = form.pricing.consultation_fee;

  const persist = async (cardKey, nextForm) => {
    setSavingCard(cardKey);
    try {
      await onSave?.(nextForm);
    } finally {
      setSavingCard(null);
    }
  };

  const handleSaveGlobal = () => persist('global', form);

  const handleSaveDepartment = async () => {
    if (!selectedDepartment) return;
    const nextFees = upsertDepartmentFee(
      form.pricing.department_consultation_fees,
      selectedDepartment,
      deptFeeDraft,
    );
    const nextForm = {
      ...form,
      pricing: {
        ...form.pricing,
        department_consultation_fees: nextFees,
      },
    };
    patch('pricing.department_consultation_fees', nextFees);
    await persist('department', nextForm);
  };

  const handleSaveDoctor = async () => {
    if (!selectedDoctor) return;
    const nextFees = upsertDoctorFee(
      form.pricing.doctor_consultation_fees,
      selectedDoctor,
      doctorFeeDraft,
    );
    const nextForm = {
      ...form,
      pricing: {
        ...form.pricing,
        doctor_consultation_fees: nextFees,
      },
    };
    patch('pricing.doctor_consultation_fees', nextFees);
    await persist('doctor', nextForm);
  };

  const cardBusy = (key) => savingCard === key || (isSaving && savingCard === key);
  const bedTariff = form.pricing?.bed_tariff ?? {};
  const wardRates = bedTariff.ward_rates ?? [];
  const specialBedRates = bedTariff.special_bed_rates ?? [];

  const updateWardRate = (index, key, value) => {
    const next = wardRates.map((row, i) => (i === index ? { ...row, [key]: value } : row));
    patch('pricing.bed_tariff.ward_rates', next);
  };
  const addWardRate = () => {
    patch('pricing.bed_tariff.ward_rates', [...wardRates, { ward_name: '', charge_per_day: 0 }]);
  };
  const removeWardRate = (index) => {
    patch('pricing.bed_tariff.ward_rates', wardRates.filter((_, i) => i !== index));
  };

  const updateSpecialBedRate = (index, key, value) => {
    const next = specialBedRates.map((row, i) => (i === index ? { ...row, [key]: value } : row));
    patch('pricing.bed_tariff.special_bed_rates', next);
  };
  const addSpecialBedRate = () => {
    patch('pricing.bed_tariff.special_bed_rates', [
      ...specialBedRates,
      { bed_number: '', ward_name: '', charge_per_day: 0 },
    ]);
  };
  const removeSpecialBedRate = (index) => {
    patch(
      'pricing.bed_tariff.special_bed_rates',
      specialBedRates.filter((_, i) => i !== index),
    );
  };
  const handleSaveBedTariff = () => persist('bed-tariff', form);

  return (
    <>
      <SectionCard
        title="Global Fees & Tax"
        icon={CircleDollarSign}
        tone="teal"
        locked={!canEditGlobalFees}
        action={
          manageAdminEditLocks ? (
            <AdminEditLockToggle
              id="admin-edit-global_fees_tax"
              checked={Boolean(adminEdit.global_fees_tax)}
              disabled={adminEditSaving}
              onChange={(v) => onAdminEditChange?.('global_fees_tax', v)}
            />
          ) : null
        }
      >
        <p className="aos-card__note">Applies to all departments and doctors</p>

        <div className="aos-grid aos-grid--3">
          <Field id="registration_fee" label="Registration fee (₹)">
            <Input
              id="registration_fee"
              type="number"
              min={0}
              step={1}
              value={form.pricing.registration_fee}
              disabled={!canEditGlobalFees}
              onChange={setNumber('pricing.registration_fee')}
            />
          </Field>
          <Field
            id="gst_percent"
            label="GST / tax (%)"
          >
            <Input
              id="gst_percent"
              type="number"
              min={0}
              max={100}
              step={0.1}
              value={form.pricing.gst_percent}
              disabled={!canEditGlobalFees}
              onChange={setNumber('pricing.gst_percent')}
            />
          </Field>
          <Field
            id="consultation_fee"
            label="Default consultation fee (₹)"
          >
            <Input
              id="consultation_fee"
              type="number"
              min={0}
              step={1}
              value={form.pricing.consultation_fee}
              disabled={!canEditGlobalFees}
              onChange={setNumber('pricing.consultation_fee')}
            />
          </Field>
        </div>

        <div className="aos-toggle-list aos-toggle-list--compact">
          <ToggleRow
            id="allow_manual_price_entry"
            label="Allow staff to type custom prices"
            checked={form.pricing.allow_manual_price_entry}
            disabled={!canEditGlobalFees}
            onChange={(v) => patch('pricing.allow_manual_price_entry', v)}
          />
        </div>

        <CardSaveBar
          onSave={handleSaveGlobal}
          saving={cardBusy('global')}
          label="Save global fees"
          disabled={!canEditGlobalFees}
        />
      </SectionCard>

      <SectionCard
        title="Bed Tariff (Per Day)"
        icon={BedDouble}
        tone="amber"
        locked={!canEditBedTariff}
        action={
          manageAdminEditLocks ? (
            <AdminEditLockToggle
              id="admin-edit-bed_tariff"
              checked={Boolean(adminEdit.bed_tariff)}
              disabled={adminEditSaving}
              onChange={(v) => onAdminEditChange?.('bed_tariff', v)}
            />
          ) : null
        }
      >
        <p className="aos-card__note">Set default ward charges and optional custom per-bed rates.</p>

        <div className="aos-grid aos-grid--3">
          <Field id="bed_tariff_general" label="General ward (₹ / day)">
            <Input
              id="bed_tariff_general"
              type="number"
              min={0}
              step={1}
              value={bedTariff.general_ward_charge ?? 0}
              onChange={setNumber('pricing.bed_tariff.general_ward_charge')}
            />
          </Field>
          <Field id="bed_tariff_private" label="Private ward (₹ / day)">
            <Input
              id="bed_tariff_private"
              type="number"
              min={0}
              step={1}
              value={bedTariff.private_ward_charge ?? 0}
              onChange={setNumber('pricing.bed_tariff.private_ward_charge')}
            />
          </Field>
          <Field id="bed_tariff_icu" label="ICU (₹ / day)">
            <Input
              id="bed_tariff_icu"
              type="number"
              min={0}
              step={1}
              value={bedTariff.icu_charge ?? 0}
              onChange={setNumber('pricing.bed_tariff.icu_charge')}
            />
          </Field>
        </div>

        <div className="aos-bed-grid">
          <section className="aos-bed-box">
            <div className="aos-bed-box__head">
              <h4>Custom ward rates</h4>
              <Button type="button" variant="outline" size="sm" onClick={addWardRate}>
                <Plus size={14} /> Add ward
              </Button>
            </div>
            <div className="aos-table-wrap">
              <table className="aos-table">
                <thead>
                  <tr>
                    <th>Ward</th>
                    <th>Charge / day (₹)</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {wardRates.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="aos-table__empty">No custom ward rates</td>
                    </tr>
                  ) : (
                    wardRates.map((row, index) => (
                      <tr key={`ward-rate-${index}`}>
                        <td>
                          <Input
                            value={row.ward_name ?? ''}
                            placeholder="e.g. Semi-Private"
                            onChange={(e) => updateWardRate(index, 'ward_name', e.target.value)}
                          />
                        </td>
                        <td>
                          <Input
                            type="number"
                            min={0}
                            step={1}
                            value={row.charge_per_day ?? 0}
                            onChange={(e) =>
                              updateWardRate(
                                index,
                                'charge_per_day',
                                e.target.value === '' ? '' : Number(e.target.value),
                              )
                            }
                          />
                        </td>
                        <td>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeWardRate(index)}
                            aria-label="Remove ward rate"
                          >
                            <Trash2 size={14} />
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="aos-bed-box">
            <div className="aos-bed-box__head">
              <h4>Special bed rates</h4>
              <Button type="button" variant="outline" size="sm" onClick={addSpecialBedRate}>
                <Plus size={14} /> Add bed
              </Button>
            </div>
            <div className="aos-table-wrap">
              <table className="aos-table">
                <thead>
                  <tr>
                    <th>Bed no.</th>
                    <th>Ward</th>
                    <th>Charge / day (₹)</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {specialBedRates.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="aos-table__empty">No special bed rates</td>
                    </tr>
                  ) : (
                    specialBedRates.map((row, index) => (
                      <tr key={`special-bed-rate-${index}`}>
                        <td>
                          <Input
                            value={row.bed_number ?? ''}
                            placeholder="e.g. ICU-2"
                            onChange={(e) => updateSpecialBedRate(index, 'bed_number', e.target.value)}
                          />
                        </td>
                        <td>
                          <Input
                            value={row.ward_name ?? ''}
                            placeholder="Optional"
                            onChange={(e) => updateSpecialBedRate(index, 'ward_name', e.target.value)}
                          />
                        </td>
                        <td>
                          <Input
                            type="number"
                            min={0}
                            step={1}
                            value={row.charge_per_day ?? 0}
                            onChange={(e) =>
                              updateSpecialBedRate(
                                index,
                                'charge_per_day',
                                e.target.value === '' ? '' : Number(e.target.value),
                              )
                            }
                          />
                        </td>
                        <td>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeSpecialBedRate(index)}
                            aria-label="Remove special bed rate"
                          >
                            <Trash2 size={14} />
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <CardSaveBar
          onSave={handleSaveBedTariff}
          saving={cardBusy('bed-tariff')}
          label="Save bed tariff"
          disabled={!canEditBedTariff}
        />
      </SectionCard>

      <SectionCard
        title="Consultation Fee By Department"
        icon={Stethoscope}
        tone="indigo"
        locked={!canEditDeptFees}
        action={
          manageAdminEditLocks ? (
            <AdminEditLockToggle
              id="admin-edit-consultation_fee_by_department"
              checked={Boolean(adminEdit.consultation_fee_by_department)}
              disabled={adminEditSaving}
              onChange={(v) => onAdminEditChange?.('consultation_fee_by_department', v)}
            />
          ) : null
        }
      >
        <div className="aos-fee-row">
          <Field id="dept_fee_select" label="Department">
            <select
              id="dept_fee_select"
              className="aos-select"
              value={selectedDeptId}
              disabled={!canEditDeptFees}
              onChange={(e) => setSelectedDeptId(e.target.value)}
            >
              {departments.length === 0 ? (
                <option value="">No departments</option>
              ) : (
                departments.map((dept) => (
                  <option key={dept.id} value={String(dept.id)}>
                    {dept.name}
                    {dept.code ? ` (${dept.code})` : ''}
                  </option>
                ))
              )}
            </select>
          </Field>
          <Field
            id="dept_fee_value"
            label="Consultation fee (₹)"
          >
            <Input
              id="dept_fee_value"
              type="number"
              min={0}
              step={1}
              placeholder={String(hospitalDefault ?? '')}
              value={deptFeeDraft}
              onChange={(e) => setDeptFeeDraft(e.target.value)}
              disabled={!selectedDepartment || !canEditDeptFees}
            />
          </Field>
          <div className="aos-fee-row__action">
            <Button
              type="button"
              onClick={handleSaveDepartment}
              disabled={cardBusy('department') || !canEditDeptFees}
            >
              <Save size={15} />
              {cardBusy('department') ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Consultation Fee By Doctor"
        icon={Stethoscope}
        tone="violet"
        locked={!canEditDoctorFees}
        action={
          manageAdminEditLocks ? (
            <AdminEditLockToggle
              id="admin-edit-consultation_fee_by_doctor"
              checked={Boolean(adminEdit.consultation_fee_by_doctor)}
              disabled={adminEditSaving}
              onChange={(v) => onAdminEditChange?.('consultation_fee_by_doctor', v)}
            />
          ) : null
        }
      >
        <div className="aos-fee-row aos-fee-row--doctor">
          <Field id="doctor_fee_dept" label="Department">
            <select
              id="doctor_fee_dept"
              className="aos-select"
              value={doctorDeptId}
              disabled={!canEditDoctorFees}
              onChange={(e) => setDoctorDeptId(e.target.value)}
            >
              {departments.length === 0 ? (
                <option value="">No departments</option>
              ) : (
                departments.map((dept) => (
                  <option key={dept.id} value={String(dept.id)}>
                    {dept.name}
                  </option>
                ))
              )}
            </select>
          </Field>
          <Field id="doctor_fee_doctor" label="Doctor">
            <select
              id="doctor_fee_doctor"
              className="aos-select"
              value={selectedDoctorId}
              onChange={(e) => setSelectedDoctorId(e.target.value)}
              disabled={!doctorsInDept.length || !canEditDoctorFees}
            >
              {doctorsInDept.length === 0 ? (
                <option value="">No doctors in this department</option>
              ) : (
                doctorsInDept.map((doc) => (
                  <option key={doc.id} value={String(doc.id)}>
                    {doctorDisplayName(doc)}
                  </option>
                ))
              )}
            </select>
          </Field>
          <Field
            id="doctor_fee_value"
            label="Consultation fee (₹)"
          >
            <Input
              id="doctor_fee_value"
              type="number"
              min={0}
              step={1}
              placeholder={String(hospitalDefault ?? '')}
              value={doctorFeeDraft}
              onChange={(e) => setDoctorFeeDraft(e.target.value)}
              disabled={!selectedDoctor || !canEditDoctorFees}
            />
          </Field>
          <div className="aos-fee-row__action">
            <Button
              type="button"
              onClick={handleSaveDoctor}
              disabled={cardBusy('doctor') || !canEditDoctorFees}
            >
              <Save size={15} />
              {cardBusy('doctor') ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </div>
      </SectionCard>
    </>
  );
}

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  BedDouble,
  ChevronDown,
  CircleDollarSign,
  Save,
  Stethoscope,
  Trash2,
} from 'lucide-react';
import {
  useAdminDepartmentsQuery,
  useAdminRolesQuery,
  useAdminStaffListQuery,
} from '@/shared/hooks/queries/useAdminQuery';
import { useBedInventoryListQuery, useBedInventorySummaryQuery } from '@/features/admin/hooks/useOpdBedsQuery';
import AdminEditLockToggle from '@/features/admin/components/AdminEditLockToggle';
import { Button, Input, Label } from '@/shared/components/common';
import {
  currencyAmountLabel,
  currencyPerDayLabel,
  getCurrencySymbol,
} from '@/shared/utils/formatCurrency';

import {
  coerceBedType,
  doubleWardStorageKey,
  isDoubleWardStorageKey,
} from '@/features/admin/utils/bedTariffRates';

/** Backend still stores General/Private/ICU in fixed fields; other wards use ward_rates. */
const BUILTIN_TARIFF_WARDS = new Set(['general', 'private', 'icu']);

function isBuiltinTariffWard(name) {
  return BUILTIN_TARIFF_WARDS.has(String(name || '').trim().toLowerCase());
}

function builtinTariffField(wardName) {
  const key = String(wardName || '').trim().toLowerCase();
  if (key === 'general') return 'general_ward_charge';
  if (key === 'private') return 'private_ward_charge';
  if (key === 'icu') return 'icu_charge';
  return null;
}

function getInventoryWardCharge(bedTariff, wardName, bedType = 'single') {
  const type = coerceBedType(bedType);
  if (type === 'double') {
    const dblKey = doubleWardStorageKey(wardName).toLowerCase();
    const match = (bedTariff?.ward_rates ?? []).find(
      (row) => String(row.ward_name || '').trim().toLowerCase() === dblKey,
    );
    if (match && match.charge_per_day !== '' && match.charge_per_day != null) {
      const n = Number(match.charge_per_day);
      if (Number.isFinite(n)) return n;
    }
    return getInventoryWardCharge(bedTariff, wardName, 'single');
  }

  const field = builtinTariffField(wardName);
  if (field) {
    const n = Number(bedTariff?.[field]);
    return Number.isFinite(n) ? n : 0;
  }
  const match = (bedTariff?.ward_rates ?? []).find(
    (row) =>
      !isDoubleWardStorageKey(row.ward_name) &&
      String(row.ward_name || '').trim().toLowerCase() ===
        String(wardName || '').trim().toLowerCase(),
  );
  if (match && match.charge_per_day !== '' && match.charge_per_day != null) {
    const n = Number(match.charge_per_day);
    return Number.isFinite(n) ? n : 0;
  }
  const fallback = Number(bedTariff?.general_ward_charge);
  return Number.isFinite(fallback) ? fallback : 0;
}

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
  const inventorySummaryQ = useBedInventorySummaryQuery();
  const inventoryListQ = useBedInventoryListQuery({});
  const [specialWardFilter, setSpecialWardFilter] = useState('');
  const [specialTypeFilter, setSpecialTypeFilter] = useState('all');
  const [wardRateTypeFilter, setWardRateTypeFilter] = useState('single');

  const inventoryWardNames = useMemo(() => {
    const rows = inventorySummaryQ.data?.wards ?? [];
    const fromSummary = rows.map((w) => String(w.ward_name || '').trim()).filter(Boolean);
    const fromBeds = (inventoryListQ.data?.beds ?? [])
      .map((b) => String(b.ward_name || '').trim())
      .filter(Boolean);
    return [...new Set([...fromSummary, ...fromBeds])].sort((a, b) => a.localeCompare(b));
  }, [inventorySummaryQ.data?.wards, inventoryListQ.data?.beds]);

  const inventoryBeds = useMemo(
    () => inventoryListQ.data?.beds ?? [],
    [inventoryListQ.data?.beds],
  );

  const bedsInSpecialWard = useMemo(() => {
    if (!specialWardFilter) return [];
    const key = specialWardFilter.toLowerCase();
    return inventoryBeds
      .filter((b) => String(b.ward_name || '').trim().toLowerCase() === key)
      .filter((b) => {
        if (specialTypeFilter === 'all') return true;
        return coerceBedType(b.bed_type) === specialTypeFilter;
      })
      .slice()
      .sort((a, b) =>
        String(a.bed_number || '').localeCompare(String(b.bed_number || ''), undefined, {
          numeric: true,
        }),
      );
  }, [inventoryBeds, specialWardFilter, specialTypeFilter]);

  const customInventoryWards = useMemo(
    () => inventoryWardNames.filter((name) => !isBuiltinTariffWard(name)),
    [inventoryWardNames],
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
  const syncedInventoryKeyRef = useRef('');

  // Keep ward_rates rows for every non-builtin inventory ward (Maternity, etc.).
  useEffect(() => {
    if (!canEditBedTariff || !customInventoryWards.length) return;
    const key = customInventoryWards.join('|');
    if (syncedInventoryKeyRef.current === key) return;

    const existing = new Set(
      wardRates
        .filter((row) => !isDoubleWardStorageKey(row.ward_name))
        .map((row) => String(row.ward_name || '').trim().toLowerCase())
        .filter(Boolean),
    );
    const missing = customInventoryWards.filter(
      (name) => !existing.has(name.toLowerCase()),
    );
    syncedInventoryKeyRef.current = key;
    if (!missing.length) return;

    const defaultCharge = Number(bedTariff.general_ward_charge);
    const fallback = Number.isFinite(defaultCharge) ? defaultCharge : 500;
    patch('pricing.bed_tariff.ward_rates', [
      ...wardRates,
      ...missing.map((ward_name) => ({
        ward_name,
        charge_per_day: fallback,
      })),
    ]);
  }, [
    canEditBedTariff,
    customInventoryWards,
    wardRates,
    bedTariff.general_ward_charge,
    patch,
  ]);

  const setInventoryWardCharge = (wardName, rawValue, bedType = 'single') => {
    const value = rawValue === '' ? '' : Number(rawValue);
    const type = coerceBedType(bedType);

    if (type === 'double') {
      const storageKey = doubleWardStorageKey(wardName);
      const key = storageKey.toLowerCase();
      const next = [...wardRates];
      const idx = next.findIndex(
        (row) => String(row.ward_name || '').trim().toLowerCase() === key,
      );
      if (idx >= 0) {
        next[idx] = { ...next[idx], ward_name: storageKey, charge_per_day: value };
      } else {
        next.push({ ward_name: storageKey, charge_per_day: value });
      }
      patch('pricing.bed_tariff.ward_rates', next);
      return;
    }

    const field = builtinTariffField(wardName);
    if (field) {
      patch(`pricing.bed_tariff.${field}`, value);
      return;
    }
    const key = String(wardName || '').trim().toLowerCase();
    const next = [...wardRates];
    const idx = next.findIndex(
      (row) =>
        !isDoubleWardStorageKey(row.ward_name) &&
        String(row.ward_name || '').trim().toLowerCase() === key,
    );
    if (idx >= 0) {
      next[idx] = { ...next[idx], ward_name: wardName, charge_per_day: value };
    } else {
      next.push({ ward_name: wardName, charge_per_day: value });
    }
    patch('pricing.bed_tariff.ward_rates', next);
  };

  const getSpecialBedCharge = (bed) => {
    const bedNo = String(bed?.bed_number || '').trim();
    const bedKey = bedNo.toLowerCase();
    const saved = specialBedRates.find(
      (row) => String(row.bed_number || '').trim().toLowerCase() === bedKey,
    );
    if (saved && saved.charge_per_day !== '' && saved.charge_per_day != null) {
      const n = Number(saved.charge_per_day);
      if (Number.isFinite(n)) return n;
    }
    return getInventoryWardCharge(
      bedTariff,
      bed?.ward_name || specialWardFilter,
      bed?.bed_type,
    );
  };

  const setSpecialBedCharge = (bed, rawValue) => {
    const bedNo = String(bed?.bed_number || '').trim();
    if (!bedNo) return;
    const wardName = String(bed?.ward_name || specialWardFilter || '').trim();
    const value = rawValue === '' ? '' : Number(rawValue);
    const bedKey = bedNo.toLowerCase();
    const next = [...specialBedRates];
    const idx = next.findIndex(
      (row) => String(row.bed_number || '').trim().toLowerCase() === bedKey,
    );
    if (idx >= 0) {
      next[idx] = {
        ...next[idx],
        bed_number: bedNo,
        ward_name: wardName,
        charge_per_day: value,
      };
    } else {
      next.push({
        bed_number: bedNo,
        ward_name: wardName,
        charge_per_day: value,
      });
    }
    patch('pricing.bed_tariff.special_bed_rates', next);
  };

  const clearSpecialBedCharge = (bed) => {
    const bedKey = String(bed?.bed_number || '').trim().toLowerCase();
    if (!bedKey) return;
    patch(
      'pricing.bed_tariff.special_bed_rates',
      specialBedRates.filter(
        (row) => String(row.bed_number || '').trim().toLowerCase() !== bedKey,
      ),
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
          <Field id="registration_fee" label={currencyAmountLabel('Registration fee')}>
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
            label={currencyAmountLabel('Default consultation fee')}
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
        <div className="aos-bed-tariff">
          <section className="aos-bed-tariff__block">
            <div className="aos-bed-tariff__label-row">
              <h4 className="aos-bed-tariff__label">Ward rates</h4>
              {inventoryWardNames.length > 0 ? (
                <div className="aos-bed-tariff__filters">
                  <select
                    id="ward_rate_type"
                    className={`aos-select aos-select--sm aos-beds__filter ${
                      wardRateTypeFilter === 'double'
                        ? 'aos-beds__filter--type'
                        : 'aos-beds__filter--ward'
                    }`}
                    value={wardRateTypeFilter}
                    disabled={!canEditBedTariff}
                    onChange={(e) => setWardRateTypeFilter(coerceBedType(e.target.value))}
                    aria-label="Ward rate bed type"
                  >
                    <option value="single">Single</option>
                    <option value="double">Double</option>
                  </select>
                  <span className="aos-bed-tariff__hint">{currencyPerDayLabel()}</span>
                </div>
              ) : null}
            </div>

            {inventorySummaryQ.isLoading ? (
              <p className="aos-bed-tariff__empty">Loading wards…</p>
            ) : inventoryWardNames.length === 0 ? (
              <p className="aos-bed-tariff__empty">
                No wards yet. Add them under Beds &amp; wards.
              </p>
            ) : (
              <div className="aos-ward-rate-strip" role="region" aria-label="Ward daily rates">
                {inventoryWardNames.map((wardName) => {
                  const fieldId = `bed_tariff_ward_${wardName
                    .replace(/\s+/g, '_')
                    .toLowerCase()}_${wardRateTypeFilter}`;
                  const fieldTone =
                    wardRateTypeFilter === 'double'
                      ? 'aos-ward-chip__field--double'
                      : 'aos-ward-chip__field--single';
                  return (
                    <label key={wardName} className="aos-ward-chip" htmlFor={fieldId}>
                      <span className="aos-ward-chip__name">{wardName}</span>
                      <span className={`aos-ward-chip__field ${fieldTone}`}>
                        <span className="aos-ward-chip__rs" aria-hidden>
                          {getCurrencySymbol()}
                        </span>
                        <Input
                          id={fieldId}
                          type="number"
                          min={0}
                          step={1}
                          className="aos-ward-chip__input"
                          value={getInventoryWardCharge(
                            bedTariff,
                            wardName,
                            wardRateTypeFilter,
                          )}
                          disabled={!canEditBedTariff}
                          onChange={(e) =>
                            setInventoryWardCharge(
                              wardName,
                              e.target.value,
                              wardRateTypeFilter,
                            )
                          }
                          aria-label={`${wardName} ${wardRateTypeFilter} bed charge per day`}
                        />
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
          </section>

          <section className="aos-bed-tariff__block aos-bed-tariff__block--beds">
            <div className="aos-bed-tariff__label-row">
              <h4 className="aos-bed-tariff__label">Special bed rates</h4>
              <div className="aos-bed-tariff__filters">
                <select
                  id="special_bed_ward"
                  className="aos-select aos-select--sm aos-beds__filter aos-beds__filter--ward"
                  value={specialWardFilter}
                  disabled={!canEditBedTariff || inventoryWardNames.length === 0}
                  onChange={(e) => setSpecialWardFilter(e.target.value)}
                  aria-label="Ward for special bed rates"
                >
                  <option value="">Select ward…</option>
                  {inventoryWardNames.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
                <select
                  id="special_bed_type"
                  className="aos-select aos-select--sm aos-beds__filter aos-beds__filter--type"
                  value={specialTypeFilter}
                  disabled={!canEditBedTariff || !specialWardFilter}
                  onChange={(e) => setSpecialTypeFilter(e.target.value)}
                  aria-label="Filter by bed type"
                >
                  <option value="all">All types</option>
                  <option value="single">Single</option>
                  <option value="double">Double</option>
                </select>
              </div>
            </div>

            <div className="aos-table-wrap aos-table-wrap--tariff">
              <table className="aos-table aos-table--tariff">
                <thead>
                  <tr>
                    <th>Bed</th>
                    <th>Type</th>
                    <th>{currencyPerDayLabel()}</th>
                    <th className="aos-bed-tariff__col-actions">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {!specialWardFilter ? (
                    <tr>
                      <td colSpan={4} className="aos-table__empty">
                        Choose a ward to edit bed rates
                      </td>
                    </tr>
                  ) : inventoryListQ.isLoading ? (
                    <tr>
                      <td colSpan={4} className="aos-table__empty">
                        Loading beds…
                      </td>
                    </tr>
                  ) : bedsInSpecialWard.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="aos-table__empty">
                        No{' '}
                        {specialTypeFilter === 'all' ? '' : `${specialTypeFilter} `}
                        beds in {specialWardFilter}
                      </td>
                    </tr>
                  ) : (
                    bedsInSpecialWard.map((bed) => {
                      const bedNo = bed.bed_number || bed.id;
                      const bedType = coerceBedType(bed.bed_type);
                      const hasOverride = specialBedRates.some(
                        (row) =>
                          String(row.bed_number || '').trim().toLowerCase() ===
                          String(bed.bed_number || '').trim().toLowerCase(),
                      );
                      return (
                        <tr
                          key={bed.id ?? bedNo}
                          className={hasOverride ? 'aos-table__row--override' : undefined}
                        >
                          <td>
                            <span className="aos-bed-tariff__bed-id">{bedNo}</span>
                            {hasOverride ? (
                              <span className="aos-bed-tariff__override-tag">Custom</span>
                            ) : null}
                          </td>
                          <td>
                            <span
                              className={`aos-beds__type aos-beds__type--${bedType}`}
                            >
                              {bedType === 'double' ? 'Double' : 'Single'}
                            </span>
                          </td>
                          <td>
                            <span className="aos-ward-chip__field aos-ward-chip__field--table">
                              <span className="aos-ward-chip__rs" aria-hidden>
                                {getCurrencySymbol()}
                              </span>
                              <Input
                                type="number"
                                min={0}
                                step={1}
                                className="aos-ward-chip__input"
                                value={getSpecialBedCharge(bed)}
                                disabled={!canEditBedTariff}
                                onChange={(e) => setSpecialBedCharge(bed, e.target.value)}
                                aria-label={`${bedNo} charge per day`}
                              />
                            </span>
                          </td>
                          <td className="aos-bed-tariff__col-actions">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              disabled={!canEditBedTariff || !hasOverride}
                              onClick={() => clearSpecialBedCharge(bed)}
                              aria-label={`Reset ${bedNo} to ward rate`}
                              title="Reset to ward rate"
                            >
                              <Trash2 size={14} />
                            </Button>
                          </td>
                        </tr>
                      );
                    })
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
            label={currencyAmountLabel('Consultation fee')}
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
            label={currencyAmountLabel('Consultation fee')}
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

import { useEffect, useMemo, useState } from 'react';
import {
  Ban,
  BedDouble,
  CalendarClock,
  ChevronDown,
  CircleDollarSign,
  CreditCard,
  Percent,
  Plus,
  Save,
  ShieldAlert,
  Trash2,
  UserCog,
} from 'lucide-react';
import {
  useAdminOpdSettingsQuery,
  useUpdateAdminOpdSettingsMutation,
} from '@/features/admin/hooks/useOpdSettingsQuery';
import { useAdminEditLocks } from '@/features/admin/hooks/useAdminEditLocks';
import {
  useAdminDepartmentsQuery,
  useAdminRolesQuery,
  useAdminStaffListQuery,
} from '@/shared/hooks/queries/useAdminQuery';
import AdminOpdPricingSection from '@/features/admin/components/AdminOpdPricingSection';
import AdminOpdBedsSection from '@/features/admin/components/AdminOpdBedsSection';
import {
  WEEKDAY_OPTIONS,
  createEmptyBillItem,
  createEmptyInsuranceProvider,
  validateOpdSettingsForm,
} from '@/features/admin/utils/opdSettingsMapper';
import { normalizeAdminEdit } from '@/features/admin/constants/adminEditLocks';
import { Button, Input, Label, QueryFeedback, SearchableSelect } from '@/shared/components/common';
import { toast } from '@/shared/utils/toast';
import { getCurrencySymbol } from '@/shared/utils/formatCurrency';
import '@/features/admin/styles/adminOpdSettings.css';

const SECTION_TABS = [
  { id: 'delete', label: 'Delete controls', icon: ShieldAlert },
  { id: 'beds', label: 'Beds & wards', icon: BedDouble },
  { id: 'pricing', label: 'Pricing & tax', icon: CircleDollarSign },
  { id: 'discount', label: 'Discount & refund', icon: Percent },
  { id: 'slots', label: 'Appointment slots', icon: CalendarClock },
  { id: 'payment', label: 'Payment & insurance', icon: CreditCard },
];

/** Keep only digits and auto-format as HH:MM (hours 00–23, minutes 00–59). */
function formatHhMmInput(raw) {
  const digits = String(raw ?? '').replace(/\D/g, '').slice(0, 4);
  if (!digits) return '';

  let hours = digits.slice(0, 2);
  let minutes = digits.slice(2, 4);

  if (hours.length === 1 && Number(hours) > 2) {
    hours = `0${hours}`;
  }
  if (hours.length === 2) {
    const h = Math.min(23, Number(hours));
    hours = String(Number.isFinite(h) ? h : 0).padStart(2, '0');
  }
  if (minutes.length === 1 && Number(minutes) > 5) {
    minutes = `0${minutes}`;
  }
  if (minutes.length === 2) {
    const m = Math.min(59, Number(minutes));
    minutes = String(Number.isFinite(m) ? m : 0).padStart(2, '0');
  }

  if (digits.length <= 2) return hours;
  return `${hours}:${minutes}`;
}

function TimeHhMmInput({ id, value, onChange, placeholder = 'HH:MM', disabled = false }) {
  return (
    <Input
      id={id}
      type="text"
      inputMode="numeric"
      placeholder={placeholder}
      maxLength={5}
      autoComplete="off"
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(formatHhMmInput(e.target.value))}
    />
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

function SectionCard({
  title,
  icon: Icon,
  children,
  action = null,
  collapsible = false,
  defaultOpen = false,
  tone = 'blue',
  locked = false,
}) {
  const [open, setOpen] = useState(defaultOpen);
  const showBody = !collapsible || open;
  const toneClass = `aos-card--tone-${tone}`;

  return (
    <section
      className={`aos-card${collapsible ? ' aos-card--accordion' : ''} ${toneClass}${
        collapsible && open ? ' is-open' : ''
      }${locked ? ' aos-card--locked' : ''}`}
    >
      {collapsible ? (
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
      ) : (
        <header className="aos-card__head">
          <div className="aos-card__title-wrap">
            {Icon ? (
              <span className="aos-card__icon" aria-hidden>
                <Icon size={16} strokeWidth={2.2} />
              </span>
            ) : null}
            <h3 className="aos-card__title">{title}</h3>
          </div>
          {action}
        </header>
      )}
      {showBody ? (
        <div className="aos-card__body">
          {locked ? (
            <p className="aos-locked-banner">
              Locked by Super Admin — you can view these settings but cannot change them.
            </p>
          ) : null}
          {children}
        </div>
      ) : null}
    </section>
  );
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

export default function AdminOpdSettingsPanel({ manageAdminEditLocks = false }) {
  const settingsQuery = useAdminOpdSettingsQuery();
  const updateMutation = useUpdateAdminOpdSettingsMutation();
  const { canEdit, lockToggle, setAdminEditLock, adminEditSaving } =
    useAdminEditLocks(manageAdminEditLocks);
  const [form, setForm] = useState(null);
  const [activeSection, setActiveSection] = useState(SECTION_TABS[0].id);
  const [billItemFilter, setBillItemFilter] = useState('all');

  // Doctor/department data for per-doctor slots
  const { data: slotDepartments = [] } = useAdminDepartmentsQuery({ is_active: true });
  const { data: slotRoles = [] } = useAdminRolesQuery();
  const slotDoctorRoleId = useMemo(
    () => slotRoles.find((r) => r.name === 'doctor')?.id,
    [slotRoles],
  );
  const { data: slotStaffData } = useAdminStaffListQuery(
    { role_id: slotDoctorRoleId, is_active: true, page: 1, limit: 100 },
    { enabled: Boolean(slotDoctorRoleId) },
  );
  const slotDoctors = useMemo(() => {
    const rows = slotStaffData?.staff ?? slotStaffData?.items ?? slotStaffData?.users ?? slotStaffData ?? [];
    return Array.isArray(rows) ? rows : [];
  }, [slotStaffData]);

  const [slotDoctorId, setSlotDoctorId] = useState('');

  useEffect(() => {
    if (settingsQuery.data) {
      setForm(settingsQuery.data);
    }
  }, [settingsQuery.data]);

  const adminEdit = normalizeAdminEdit(form?.admin_edit);

  const sourceLabel = useMemo(() => {
    if (!form?._source) return '';
    if (form._source === 'api') return 'Synced with backend';
    if (form._source === 'local') return 'Saved locally (backend route pending)';
    return 'Showing defaults — save to apply';
  }, [form?._source]);

  const buildPatchedForm = (source, path, value) => {
    if (!source) return source;
    const next = JSON.parse(JSON.stringify(source));
    const keys = path.split('.');
    let cursor = next;
    for (let i = 0; i < keys.length - 1; i += 1) {
      const key = keys[i];
      if (cursor[key] == null || typeof cursor[key] !== 'object') {
        cursor[key] = {};
      }
      cursor = cursor[key];
    }
    cursor[keys[keys.length - 1]] = value;
    return next;
  };

  const patch = (path, value) => {
    setForm((prev) => {
      if (!prev) return prev;
      return buildPatchedForm(prev, path, value);
    });
  };

  const setNumber = (path) => (e) => {
    const raw = e.target.value;
    patch(path, raw === '' ? '' : Number(raw));
  };

  const toggleWorkingDay = (code) => {
    if (!canEdit('hospital_default_slots')) return;
    const days = form?.appointment_slots?.working_days ?? [];
    const next = days.includes(code)
      ? days.filter((d) => d !== code)
      : [...days, code];
    patch('appointment_slots.working_days', next);
  };

  const updateBillItem = (id, key, value) => {
    const items = (form.pricing.bill_items ?? []).map((item) =>
      item.id === id ? { ...item, [key]: value } : item,
    );
    patch('pricing.bill_items', items);
  };

  const removeBillItem = (id) => {
    patch(
      'pricing.bill_items',
      (form.pricing.bill_items ?? []).filter((item) => item.id !== id),
    );
  };

  const addBillItem = () => {
    patch('pricing.bill_items', [
      ...(form.pricing.bill_items ?? []),
      createEmptyBillItem(),
    ]);
  };

  const updateProvider = (id, key, value) => {
    const providers = (form.payment_modes.insurance_providers ?? []).map((p) =>
      p.id === id ? { ...p, [key]: value } : p,
    );
    patch('payment_modes.insurance_providers', providers);
  };

  const removeProvider = (id) => {
    patch(
      'payment_modes.insurance_providers',
      (form.payment_modes.insurance_providers ?? []).filter((p) => p.id !== id),
    );
  };

  const addProvider = () => {
    patch('payment_modes.insurance_providers', [
      ...(form.payment_modes.insurance_providers ?? []),
      createEmptyInsuranceProvider(),
    ]);
  };

  const saveSettings = async (overrideForm = null, options = {}) => {
    const { silentSuccess = false } = options;
    const payload = overrideForm ?? form;
    if (!payload) return;
    const errors = validateOpdSettingsForm(payload);
    if (errors.length) {
      toast.error(errors[0]);
      return;
    }
    try {
      const saved = await updateMutation.mutateAsync(payload);
      setForm(saved);
      if (!silentSuccess) {
        toast.success(
          saved._source === 'api'
            ? 'OPD settings saved'
            : 'OPD settings saved locally (backend pending)',
        );
      }
    } catch (err) {
      toast.error(err?.message || 'Failed to save OPD settings');
    }
  };

  const autoSavePaymentModeToggle = async (index, enabled) => {
    if (!form || updateMutation.isPending) return;
    if (!canEdit('payment_modes')) return;
    const modes = [...(form.payment_modes?.modes ?? [])];
    modes[index] = { ...modes[index], enabled };
    const next = buildPatchedForm(form, 'payment_modes.modes', modes);
    setForm(next);
    await saveSettings(next, { silentSuccess: true });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    await saveSettings();
  };

  const footerLocked =
    (activeSection === 'delete' && !canEdit('delete_controls')) ||
    (activeSection === 'discount' && !canEdit('discount_refund')) ||
    (activeSection === 'slots' &&
      !canEdit('hospital_default_slots') &&
      !canEdit('doctor_slot_overrides')) ||
    (activeSection === 'payment' &&
      !canEdit('payment_modes') &&
      !canEdit('bank_upi_details') &&
      !canEdit('insurance_providers'));

  return (
    <div className="aos-page">
      <div className="aos-page__intro">
        <div>
          <h2 className="admin-card__title">OPD settings</h2>
        </div>
        {sourceLabel ? <span className="aos-source-pill">{sourceLabel}</span> : null}
      </div>

      <QueryFeedback
        isLoading={settingsQuery.isLoading}
        isError={settingsQuery.isError}
        error={settingsQuery.error}
        onRetry={settingsQuery.refetch}
      >
        {form ? (
          <div className="aos-form">
            <div className="aos-section-tabs" role="tablist" aria-label="OPD setting sections">
              {SECTION_TABS.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={activeSection === tab.id}
                    className={`aos-section-tab${activeSection === tab.id ? ' is-active' : ''}`}
                    onClick={() => setActiveSection(tab.id)}
                  >
                    <Icon size={15} strokeWidth={2.2} aria-hidden />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {activeSection === 'beds' ? (
              <AdminOpdBedsSection
                manageAdminEditLocks={manageAdminEditLocks}
                canEditBedInventory={canEdit('bed_inventory')}
                canEditWards={canEdit('wards')}
                canEditAllBeds={canEdit('all_beds')}
                lockToggle={lockToggle}
                adminEditSaving={adminEditSaving}
              />
            ) : null}

            {activeSection !== 'beds' ? (
          <form className="aos-form__inner" onSubmit={handleSave}>
            {activeSection === 'delete' ? (
              <SectionCard
                title="Delete button control"
                icon={Ban}
                locked={!canEdit('delete_controls')}
                action={lockToggle('delete_controls')}
              >
                <p className="aos-card__hint">
                  Restrict destructive actions for OPD staff. Recommended defaults keep
                  deletes Admin-only.
                </p>
                <div className="aos-toggle-list">
                  <ToggleRow
                    id="allow_patient_delete"
                    label="Allow OPD staff to delete patients"
                    hint="When off, only Admin can delete patient records."
                    checked={form.delete_controls.allow_patient_delete}
                    disabled={!canEdit('delete_controls')}
                    onChange={(v) => patch('delete_controls.allow_patient_delete', v)}
                  />
                  <ToggleRow
                    id="allow_appointment_delete"
                    label="Allow OPD staff to delete appointments"
                    hint="When off, appointment Delete is hidden for Billing Counter."
                    checked={form.delete_controls.allow_appointment_delete}
                    disabled={!canEdit('delete_controls')}
                    onChange={(v) => patch('delete_controls.allow_appointment_delete', v)}
                  />
                  <ToggleRow
                    id="allow_unpaid_bill_delete"
                    label="Allow OPD staff to delete unpaid bills"
                    hint="When off, unpaid bill delete requires Admin."
                    checked={form.delete_controls.allow_unpaid_bill_delete}
                    disabled={!canEdit('delete_controls')}
                    onChange={(v) => patch('delete_controls.allow_unpaid_bill_delete', v)}
                  />
                  <ToggleRow
                    id="require_admin_approval_for_delete"
                    label="Require Admin approval for deletes"
                    hint="Future approval workflow when staff requests a delete."
                    checked={form.delete_controls.require_admin_approval_for_delete}
                    disabled={!canEdit('delete_controls')}
                    onChange={(v) =>
                      patch('delete_controls.require_admin_approval_for_delete', v)
                    }
                  />
                </div>
              </SectionCard>
            ) : null}

            {activeSection === 'pricing' ? (
              <>
                <AdminOpdPricingSection
                  form={form}
                  patch={patch}
                  setNumber={setNumber}
                  onSave={saveSettings}
                  isSaving={updateMutation.isPending}
                  manageAdminEditLocks={manageAdminEditLocks}
                  canEditGlobalFees={canEdit('global_fees_tax')}
                  canEditBedTariff={canEdit('bed_tariff')}
                  canEditDeptFees={canEdit('consultation_fee_by_department')}
                  canEditDoctorFees={canEdit('consultation_fee_by_doctor')}
                  adminEdit={adminEdit}
                  onAdminEditChange={setAdminEditLock}
                  adminEditSaving={adminEditSaving}
                />

                <SectionCard
                  title="Bill Item Price List"
                  icon={CircleDollarSign}
                  collapsible
                  tone="rose"
                  locked={!canEdit('bill_item_price_list')}
                  action={
                    <>
                      {lockToggle('bill_item_price_list')}
                      {canEdit('bill_item_price_list') ? (
                        <Button type="button" variant="outline" size="sm" onClick={addBillItem}>
                          <Plus size={14} /> Add Item
                        </Button>
                      ) : null}
                    </>
                  }
                >
                  <div className="aos-bill-list">
                    <div className="aos-bill-list__toolbar">
                      <label className="aos-bill-list__filter" htmlFor="bill_item_filter">
                        <span>Show</span>
                        <select
                          id="bill_item_filter"
                          className="aos-select aos-select--sm"
                          value={billItemFilter}
                          onChange={(e) => setBillItemFilter(e.target.value)}
                          disabled={!canEdit('bill_item_price_list')}
                        >
                          <option value="all">All items</option>
                          <option value="active">Active only</option>
                          <option value="inactive">Inactive only</option>
                        </select>
                      </label>
                      <span className="aos-bill-list__count">
                        {
                          (form.pricing.bill_items ?? []).filter((item) => {
                            if (billItemFilter === 'active') return Boolean(item.is_active);
                            if (billItemFilter === 'inactive') return !item.is_active;
                            return true;
                          }).length
                        }{' '}
                        items
                      </span>
                    </div>

                    <div className="aos-bill-list__grid">
                      {(form.pricing.bill_items ?? [])
                        .filter((item) => {
                          if (billItemFilter === 'active') return Boolean(item.is_active);
                          if (billItemFilter === 'inactive') return !item.is_active;
                          return true;
                        })
                        .map((item) => (
                          <div
                            key={item.id}
                            className={`aos-bill-list__row${!item.is_active ? ' is-inactive' : ''}`}
                          >
                            <Input
                              className="aos-bill-list__name"
                              value={item.name}
                              placeholder="Item name"
                              disabled={!canEdit('bill_item_price_list')}
                              onChange={(e) =>
                                updateBillItem(item.id, 'name', e.target.value)
                              }
                            />
                            <div className="aos-bill-list__price">
                              <span aria-hidden>{getCurrencySymbol()}</span>
                              <Input
                                type="number"
                                min={0}
                                step={1}
                                value={item.price}
                                disabled={!canEdit('bill_item_price_list')}
                                onChange={(e) =>
                                  updateBillItem(
                                    item.id,
                                    'price',
                                    e.target.value === '' ? '' : Number(e.target.value),
                                  )
                                }
                              />
                            </div>
                            <label className="aos-bill-list__active">
                              <input
                                type="checkbox"
                                checked={Boolean(item.is_active)}
                                disabled={!canEdit('bill_item_price_list')}
                                onChange={(e) =>
                                  updateBillItem(item.id, 'is_active', e.target.checked)
                                }
                                aria-label={`Active ${item.name || 'item'}`}
                              />
                              <span>On</span>
                            </label>
                            {canEdit('bill_item_price_list') ? (
                              <button
                                type="button"
                                className="aos-bill-list__remove"
                                onClick={() => removeBillItem(item.id)}
                                aria-label="Remove item"
                              >
                                <Trash2 size={14} />
                              </button>
                            ) : null}
                          </div>
                        ))}
                    </div>

                    <div className="aos-card-save">
                      <Button
                        type="button"
                        onClick={() => saveSettings()}
                        disabled={
                          updateMutation.isPending || !canEdit('bill_item_price_list')
                        }
                      >
                        <Save size={15} />
                        {updateMutation.isPending ? 'Saving…' : 'Save bill items'}
                      </Button>
                    </div>
                  </div>
                </SectionCard>
              </>
            ) : null}

            {activeSection === 'discount' ? (
              <SectionCard
                title="Discount & refund approval"
                icon={Percent}
                locked={!canEdit('discount_refund')}
                action={lockToggle('discount_refund')}
              >
                <div className="aos-toggle-list">
                  <ToggleRow
                    id="allow_discount"
                    label="Allow discount on bills"
                    hint="Shows discount field on billing when enabled."
                    checked={form.discount_refund.allow_discount}
                    disabled={!canEdit('discount_refund')}
                    onChange={(v) => patch('discount_refund.allow_discount', v)}
                  />
                  <ToggleRow
                    id="require_admin_approval_for_discount"
                    label="Discount requires Admin approval"
                    checked={form.discount_refund.require_admin_approval_for_discount}
                    disabled={!canEdit('discount_refund')}
                    onChange={(v) =>
                      patch('discount_refund.require_admin_approval_for_discount', v)
                    }
                  />
                  <ToggleRow
                    id="allow_refund"
                    label="Allow refunds"
                    checked={form.discount_refund.allow_refund}
                    disabled={!canEdit('discount_refund')}
                    onChange={(v) => patch('discount_refund.allow_refund', v)}
                  />
                  <ToggleRow
                    id="require_admin_approval_for_refund"
                    label="Refund requires Admin approval"
                    checked={form.discount_refund.require_admin_approval_for_refund}
                    disabled={!canEdit('discount_refund')}
                    onChange={(v) =>
                      patch('discount_refund.require_admin_approval_for_refund', v)
                    }
                  />
                  <ToggleRow
                    id="allow_cancel_paid_bill"
                    label="Allow cancel / void of paid bills"
                    hint="When off, paid bills cannot be cancelled from OPD."
                    checked={form.discount_refund.allow_cancel_paid_bill}
                    disabled={!canEdit('discount_refund')}
                    onChange={(v) => patch('discount_refund.allow_cancel_paid_bill', v)}
                  />
                </div>
                <div className="aos-grid aos-grid--2 aos-grid--top">
                  <Field
                    id="max_discount_percent"
                    label="Maximum discount (%)"
                    hint="Staff cannot exceed this without Admin override."
                  >
                    <Input
                      id="max_discount_percent"
                      type="number"
                      min={0}
                      max={100}
                      step={0.5}
                      value={form.discount_refund.max_discount_percent}
                      disabled={!canEdit('discount_refund')}
                      onChange={setNumber('discount_refund.max_discount_percent')}
                    />
                  </Field>
                </div>
              </SectionCard>
            ) : null}

            {activeSection === 'slots' ? (
              <div className="aos-slots">
                <section
                  className={`aos-slots-panel aos-slots-panel--defaults${
                    !canEdit('hospital_default_slots') ? ' aos-slots-panel--locked' : ''
                  }`}
                >
                  <div className="aos-slots-panel__head">
                    <span className="aos-slots-panel__icon" aria-hidden>
                      <CalendarClock size={16} strokeWidth={2.2} />
                    </span>
                    <div className="aos-slots-panel__titles">
                      <h3 className="aos-slots-panel__title">Hospital-Wide Default Slots</h3>
                      <p className="aos-slots-panel__sub">
                        {form.appointment_slots.start_time || '—'} –{' '}
                        {form.appointment_slots.end_time || '—'}
                        {' · '}
                        {form.appointment_slots.slot_duration_minutes || '—'} Min
                        {' · '}
                        {(form.appointment_slots.working_days ?? []).length} Days
                      </p>
                    </div>
                    <div className="aos-slots-panel__head-action">
                      {lockToggle('hospital_default_slots')}
                    </div>
                  </div>
                  <div className="aos-slots-panel__body">
                    {!canEdit('hospital_default_slots') ? (
                      <p className="aos-locked-banner">
                        Locked by Super Admin — you can view these settings but cannot change them.
                      </p>
                    ) : null}
                    <div className="aos-grid aos-grid--3">
                      <Field id="slot_start" label="Day Start">
                        <TimeHhMmInput
                          id="slot_start"
                          placeholder="HH:MM (e.g. 09:00)"
                          value={form.appointment_slots.start_time}
                          disabled={!canEdit('hospital_default_slots')}
                          onChange={(v) => patch('appointment_slots.start_time', v)}
                        />
                      </Field>
                      <Field id="slot_end" label="Day End">
                        <TimeHhMmInput
                          id="slot_end"
                          placeholder="HH:MM (e.g. 16:30)"
                          value={form.appointment_slots.end_time}
                          disabled={!canEdit('hospital_default_slots')}
                          onChange={(v) => patch('appointment_slots.end_time', v)}
                        />
                      </Field>
                      <Field id="slot_duration" label="Slot Duration (Minutes)">
                        <Input
                          id="slot_duration"
                          type="number"
                          min={5}
                          max={240}
                          step={5}
                          value={form.appointment_slots.slot_duration_minutes}
                          disabled={!canEdit('hospital_default_slots')}
                          onChange={setNumber('appointment_slots.slot_duration_minutes')}
                        />
                      </Field>
                    </div>
                    <div className="aos-field aos-slots-days">
                      <Label>Working Days</Label>
                      <div className="aos-day-pills aos-day-pills--teal">
                        {WEEKDAY_OPTIONS.map((day) => {
                          const active = (form.appointment_slots.working_days ?? []).includes(
                            day.code,
                          );
                          return (
                            <button
                              key={day.code}
                              type="button"
                              className={`aos-day-pill${active ? ' is-active' : ''}`}
                              disabled={!canEdit('hospital_default_slots')}
                              onClick={() => toggleWorkingDay(day.code)}
                            >
                              {day.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </section>

                <SectionCard
                  title="Doctor-Specific Slot Overrides"
                  icon={UserCog}
                  collapsible
                  tone="indigo"
                  locked={!canEdit('doctor_slot_overrides')}
                  action={
                    <>
                      {lockToggle('doctor_slot_overrides')}
                      <span className="aos-card__note">
                        {(form.appointment_slots.doctor_slots ?? []).length} Override
                        {(form.appointment_slots.doctor_slots ?? []).length !== 1 ? 's' : ''}
                      </span>
                    </>
                  }
                >
                  {canEdit('doctor_slot_overrides') ? (
                    <div className="aos-slot-add-bar">
                      <div className="aos-slot-add-bar__select">
                        <SearchableSelect
                          placeholder="Search Doctor By Name Or Department…"
                          value={slotDoctorId}
                          onChange={(val) => setSlotDoctorId(val)}
                          clearable
                          options={slotDoctors
                            .filter((doc) => {
                              const existing = form.appointment_slots.doctor_slots ?? [];
                              return !existing.some((s) => Number(s.doctor_id) === Number(doc.id));
                            })
                            .map((doc) => {
                              const dept = slotDepartments.find((d) => d.id === doc.department_id);
                              const name = [doc.first_name, doc.last_name].filter(Boolean).join(' ');
                              return {
                                value: String(doc.id),
                                label: `Dr. ${name}`,
                                sublabel: dept?.name || '',
                              };
                            })}
                        />
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        disabled={!slotDoctorId}
                        onClick={() => {
                          const doc = slotDoctors.find((d) => String(d.id) === slotDoctorId);
                          if (!doc) return;
                          const dept = slotDepartments.find((d) => d.id === doc.department_id);
                          const name = [doc.first_name, doc.last_name].filter(Boolean).join(' ');
                          const newSlot = {
                            doctor_id: Number(doc.id),
                            doctor_name: `Dr. ${name}`,
                            department_id: doc.department_id ?? null,
                            department_name: dept?.name || '',
                            start_time: form.appointment_slots.start_time,
                            end_time: form.appointment_slots.end_time,
                            slot_duration_minutes: form.appointment_slots.slot_duration_minutes,
                            working_days: [...(form.appointment_slots.working_days ?? [])],
                          };
                          patch('appointment_slots.doctor_slots', [
                            ...(form.appointment_slots.doctor_slots ?? []),
                            newSlot,
                          ]);
                          setSlotDoctorId('');
                        }}
                      >
                        <Plus size={14} /> Add
                      </Button>
                    </div>
                  ) : null}

                  {(form.appointment_slots.doctor_slots ?? []).length === 0 ? (
                    <div className="aos-slot-empty">
                      <p>No Doctor Overrides Yet</p>
                      <span>
                        All doctors use hospital-wide defaults. Search and add a doctor to customize.
                      </span>
                    </div>
                  ) : (
                    <div className="aos-doctor-slots">
                      {(form.appointment_slots.doctor_slots ?? []).map((slot, idx) => {
                        const patchSlot = (key, value) => {
                          if (!canEdit('doctor_slot_overrides')) return;
                          const next = [...(form.appointment_slots.doctor_slots ?? [])];
                          next[idx] = { ...next[idx], [key]: value };
                          patch('appointment_slots.doctor_slots', next);
                        };
                        const toggleDay = (code) => {
                          if (!canEdit('doctor_slot_overrides')) return;
                          const days = slot.working_days ?? [];
                          patchSlot(
                            'working_days',
                            days.includes(code) ? days.filter((d) => d !== code) : [...days, code],
                          );
                        };
                        return (
                          <details key={slot.doctor_id} className="aos-dslot">
                            <summary className="aos-dslot__summary">
                              <div className="aos-dslot__info">
                                <strong className="aos-dslot__name">{slot.doctor_name}</strong>
                                {slot.department_name ? (
                                  <span className="aos-dslot__dept">{slot.department_name}</span>
                                ) : null}
                                <span className="aos-dslot__meta">
                                  {slot.start_time}–{slot.end_time} · {slot.slot_duration_minutes} Min ·{' '}
                                  {(slot.working_days ?? []).length} Days
                                </span>
                              </div>
                              {canEdit('doctor_slot_overrides') ? (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="aos-dslot__remove"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    patch(
                                      'appointment_slots.doctor_slots',
                                      (form.appointment_slots.doctor_slots ?? []).filter(
                                        (_, i) => i !== idx,
                                      ),
                                    );
                                  }}
                                  aria-label={`Remove ${slot.doctor_name}`}
                                >
                                  <Trash2 size={14} />
                                </Button>
                              ) : null}
                            </summary>
                            <div className="aos-dslot__body">
                              <div className="aos-grid aos-grid--3">
                                <Field id={`ds_start_${slot.doctor_id}`} label="Day Start">
                                  <TimeHhMmInput
                                    id={`ds_start_${slot.doctor_id}`}
                                    value={slot.start_time}
                                    disabled={!canEdit('doctor_slot_overrides')}
                                    onChange={(v) => patchSlot('start_time', v)}
                                  />
                                </Field>
                                <Field id={`ds_end_${slot.doctor_id}`} label="Day End">
                                  <TimeHhMmInput
                                    id={`ds_end_${slot.doctor_id}`}
                                    value={slot.end_time}
                                    disabled={!canEdit('doctor_slot_overrides')}
                                    onChange={(v) => patchSlot('end_time', v)}
                                  />
                                </Field>
                                <Field id={`ds_dur_${slot.doctor_id}`} label="Slot Duration (Min)">
                                  <Input
                                    id={`ds_dur_${slot.doctor_id}`}
                                    type="number"
                                    min={5}
                                    max={240}
                                    step={5}
                                    value={slot.slot_duration_minutes}
                                    disabled={!canEdit('doctor_slot_overrides')}
                                    onChange={(e) =>
                                      patchSlot(
                                        'slot_duration_minutes',
                                        e.target.value === '' ? '' : Number(e.target.value),
                                      )
                                    }
                                  />
                                </Field>
                              </div>
                              <div className="aos-field">
                                <Label>Working Days</Label>
                                <div className="aos-day-pills aos-day-pills--indigo">
                                  {WEEKDAY_OPTIONS.map((day) => (
                                    <button
                                      key={day.code}
                                      type="button"
                                      className={`aos-day-pill${(slot.working_days ?? []).includes(day.code) ? ' is-active' : ''}`}
                                      disabled={!canEdit('doctor_slot_overrides')}
                                      onClick={() => toggleDay(day.code)}
                                    >
                                      {day.label}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </details>
                        );
                      })}
                    </div>
                  )}
                </SectionCard>
              </div>
            ) : null}

            {activeSection === 'payment' ? (
              <>
                <SectionCard
                  title="Payment modes"
                  icon={CreditCard}
                  locked={!canEdit('payment_modes')}
                  action={lockToggle('payment_modes')}
                >
                  <div className="aos-toggle-list">
                    {(form.payment_modes.modes ?? []).map((mode, index) => (
                      <ToggleRow
                        key={mode.code}
                        id={`mode_${mode.code}`}
                        label={mode.label}
                        hint={`Code: ${mode.code}`}
                        checked={mode.enabled}
                        disabled={updateMutation.isPending || !canEdit('payment_modes')}
                        onChange={(v) => void autoSavePaymentModeToggle(index, v)}
                      />
                    ))}
                  </div>
                </SectionCard>

                <SectionCard
                  title="Bank / UPI details"
                  icon={CreditCard}
                  locked={!canEdit('bank_upi_details')}
                  action={lockToggle('bank_upi_details')}
                >
                  <div className="aos-grid aos-grid--2">
                    <Field id="account_name" label="Account name">
                      <Input
                        id="account_name"
                        value={form.payment_modes.bank_details.account_name}
                        disabled={!canEdit('bank_upi_details')}
                        onChange={(e) =>
                          patch('payment_modes.bank_details.account_name', e.target.value)
                        }
                      />
                    </Field>
                    <Field id="bank_name" label="Bank name">
                      <Input
                        id="bank_name"
                        value={form.payment_modes.bank_details.bank_name}
                        disabled={!canEdit('bank_upi_details')}
                        onChange={(e) =>
                          patch('payment_modes.bank_details.bank_name', e.target.value)
                        }
                      />
                    </Field>
                    <Field id="account_number" label="Account number">
                      <Input
                        id="account_number"
                        value={form.payment_modes.bank_details.account_number}
                        disabled={!canEdit('bank_upi_details')}
                        onChange={(e) =>
                          patch(
                            'payment_modes.bank_details.account_number',
                            e.target.value,
                          )
                        }
                      />
                    </Field>
                    <Field id="ifsc" label="IFSC">
                      <Input
                        id="ifsc"
                        value={form.payment_modes.bank_details.ifsc}
                        disabled={!canEdit('bank_upi_details')}
                        onChange={(e) =>
                          patch('payment_modes.bank_details.ifsc', e.target.value)
                        }
                      />
                    </Field>
                    <Field id="upi_id" label="UPI ID" hint="Shown on payment receipts when set.">
                      <Input
                        id="upi_id"
                        value={form.payment_modes.bank_details.upi_id}
                        disabled={!canEdit('bank_upi_details')}
                        onChange={(e) =>
                          patch('payment_modes.bank_details.upi_id', e.target.value)
                        }
                      />
                    </Field>
                  </div>
                </SectionCard>

                <SectionCard
                  title="Insurance providers"
                  icon={CreditCard}
                  locked={!canEdit('insurance_providers')}
                  action={
                    <>
                      {lockToggle('insurance_providers')}
                      {canEdit('insurance_providers') ? (
                        <Button type="button" variant="outline" size="sm" onClick={addProvider}>
                          <Plus size={14} /> Add provider
                        </Button>
                      ) : null}
                    </>
                  }
                >
                  {(form.payment_modes.insurance_providers ?? []).length === 0 ? (
                    <p className="aos-card__hint">
                      No insurance providers yet. Add providers for OPD insurance billing.
                    </p>
                  ) : (
                    <div className="aos-table-wrap">
                      <table className="aos-table">
                        <thead>
                          <tr>
                            <th>Provider name</th>
                            <th>Code</th>
                            <th>Active</th>
                            <th />
                          </tr>
                        </thead>
                        <tbody>
                          {form.payment_modes.insurance_providers.map((provider) => (
                            <tr key={provider.id}>
                              <td>
                                <Input
                                  value={provider.name}
                                  placeholder="e.g. Star Health"
                                  disabled={!canEdit('insurance_providers')}
                                  onChange={(e) =>
                                    updateProvider(provider.id, 'name', e.target.value)
                                  }
                                />
                              </td>
                              <td>
                                <Input
                                  value={provider.code}
                                  placeholder="STAR"
                                  disabled={!canEdit('insurance_providers')}
                                  onChange={(e) =>
                                    updateProvider(provider.id, 'code', e.target.value)
                                  }
                                />
                              </td>
                              <td>
                                <input
                                  type="checkbox"
                                  checked={Boolean(provider.is_active)}
                                  disabled={!canEdit('insurance_providers')}
                                  onChange={(e) =>
                                    updateProvider(
                                      provider.id,
                                      'is_active',
                                      e.target.checked,
                                    )
                                  }
                                  aria-label={`Active ${provider.name || 'provider'}`}
                                />
                              </td>
                              <td>
                                {canEdit('insurance_providers') ? (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeProvider(provider.id)}
                                    aria-label="Remove provider"
                                  >
                                    <Trash2 size={14} />
                                  </Button>
                                ) : null}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </SectionCard>
              </>
            ) : null}

            {activeSection !== 'pricing' ? (
              <div className="aos-form__footer">
                <Button
                  type="submit"
                  disabled={updateMutation.isPending || footerLocked}
                >
                  <Save size={16} />
                  {updateMutation.isPending ? 'Saving…' : 'Save OPD settings'}
                </Button>
              </div>
            ) : null}
          </form>
            ) : null}
          </div>
        ) : null}
      </QueryFeedback>
    </div>
  );
}

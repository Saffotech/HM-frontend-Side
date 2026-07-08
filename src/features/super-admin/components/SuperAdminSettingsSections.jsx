import {
  Award,
  Banknote,
  BedDouble,
  Building2,
  CalendarClock,
  CircleDollarSign,
  Clock,
  CreditCard,
  Globe,
  Hospital,
  LayoutDashboard,
  Mail,
  MapPin,
  Palette,
  Percent,
  Phone,
  Receipt,
  RefreshCw,
  Shield,
  Smartphone,
  Stethoscope,
  Tag,
} from 'lucide-react';
import { HOSPITAL_SETTINGS_PAYMENT_MODES } from '@/features/super-admin/mock/hospitalSettingsDefaults';
import { Input, Label } from '@/shared/components/common';

const PAYMENT_MODE_META = {
  Cash: { icon: Banknote, tone: 'emerald' },
  Card: { icon: CreditCard, tone: 'indigo' },
  UPI: { icon: Smartphone, tone: 'violet' },
  Insurance: { icon: Shield, tone: 'amber' },
  Online: { icon: Globe, tone: 'cyan' },
};

const WARD_RATE_META = [
  { key: 'ward_rate_general', label: 'General ward', sub: 'Standard inpatient care', tone: 'teal' },
  { key: 'ward_rate_icu', label: 'ICU', sub: 'Critical care unit', tone: 'rose' },
  { key: 'ward_rate_private', label: 'Private ward', sub: 'Single / deluxe rooms', tone: 'indigo' },
  { key: 'ward_rate_pediatric', label: 'Pediatric ward', sub: 'Child inpatient care', tone: 'amber' },
];

function formatCurrency(value, symbol = '₹') {
  const num = Number(value);
  if (!Number.isFinite(num)) return `${symbol}—`;
  return `${symbol}${num.toLocaleString('en-IN')}`;
}

export function SettingsBlock({ title, icon: Icon, children, className = '' }) {
  return (
    <section className={`sa-settings-block ${className}`.trim()}>
      <header className="sa-settings-block__head">
        {Icon ? (
          <span className="sa-settings-block__icon" aria-hidden>
            <Icon size={15} strokeWidth={2.2} />
          </span>
        ) : null}
        <h3 className="sa-settings-block__title">{title}</h3>
      </header>
      <div className="sa-settings-block__body">{children}</div>
    </section>
  );
}

export function SettingsField({ id, label, hint, children, fullWidth = false }) {
  return (
    <div className={`sa-settings-field${fullWidth ? ' sa-settings-field--full' : ''}`}>
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint ? <p className="sa-settings-field__hint">{hint}</p> : null}
    </div>
  );
}

export function ProfileSettingsSection({ form, setField, setNumberField }) {
  return (
    <div className="sa-settings-layout">
      <div className="sa-settings-hero sa-settings-hero--profile">
        <div className="sa-settings-hero__icon" aria-hidden>
          <Hospital size={28} strokeWidth={1.8} />
        </div>
        <div className="sa-settings-hero__content">
          <p className="sa-settings-hero__eyebrow">Live preview</p>
          <h2 className="sa-settings-hero__title">{form.hospital_name || 'Hospital name'}</h2>
          <div className="sa-settings-hero__meta">
            {form.accreditation ? (
              <span className="sa-settings-pill sa-settings-pill--profile">{form.accreditation}</span>
            ) : null}
            {form.founded_year ? (
              <span className="sa-settings-hero__meta-item">Est. {form.founded_year}</span>
            ) : null}
          </div>
          <p className="sa-settings-hero__desc">
            <MapPin size={14} aria-hidden />
            {form.address || 'Address will appear on bills and reports'}
          </p>
        </div>
      </div>

      <div className="sa-settings-blocks sa-settings-blocks--2">
        <SettingsBlock title="Hospital identity" icon={Building2} className="sa-settings-block--profile">
          <div className="sa-settings-block__grid">
            <SettingsField id="hospital_name" label="Hospital name">
              <Input
                id="hospital_name"
                value={form.hospital_name ?? ''}
                onChange={(e) => setField('hospital_name', e.target.value)}
              />
            </SettingsField>
            <SettingsField id="accreditation" label="Accreditation">
              <Input
                id="accreditation"
                value={form.accreditation ?? ''}
                onChange={(e) => setField('accreditation', e.target.value)}
              />
            </SettingsField>
            <SettingsField id="founded_year" label="Founded year">
              <Input
                id="founded_year"
                type="number"
                min={1800}
                max={2100}
                value={form.founded_year ?? ''}
                onChange={setNumberField('founded_year')}
              />
            </SettingsField>
            <SettingsField id="website" label="Website">
              <Input
                id="website"
                type="url"
                value={form.website ?? ''}
                onChange={(e) => setField('website', e.target.value)}
              />
            </SettingsField>
          </div>
        </SettingsBlock>

        <SettingsBlock title="Contact & location" icon={Phone} className="sa-settings-block--profile">
          <div className="sa-settings-block__grid">
            <SettingsField id="contact_email" label="Contact email">
              <Input
                id="contact_email"
                type="email"
                value={form.contact_email ?? ''}
                onChange={(e) => setField('contact_email', e.target.value)}
              />
            </SettingsField>
            <SettingsField id="contact_phone" label="Contact phone">
              <Input
                id="contact_phone"
                type="tel"
                value={form.contact_phone ?? ''}
                onChange={(e) => setField('contact_phone', e.target.value)}
              />
            </SettingsField>
            <SettingsField id="emergency_line" label="Emergency line">
              <Input
                id="emergency_line"
                type="tel"
                value={form.emergency_line ?? ''}
                onChange={(e) => setField('emergency_line', e.target.value)}
              />
            </SettingsField>
            <SettingsField id="address" label="Address" fullWidth>
              <Input
                id="address"
                value={form.address ?? ''}
                onChange={(e) => setField('address', e.target.value)}
              />
            </SettingsField>
          </div>
        </SettingsBlock>
      </div>
    </div>
  );
}

export function OpdSettingsSection({ form, setField, setNumberField }) {
  const symbol = form.currency_symbol ?? '₹';

  return (
    <div className="sa-settings-layout">
      <div className="sa-settings-stats sa-settings-stats--opd">
        <div className="sa-settings-stat sa-settings-stat--opd">
          <Receipt size={18} aria-hidden />
          <div>
            <span className="sa-settings-stat__label">Registration</span>
            <strong className="sa-settings-stat__value">{formatCurrency(form.registration_fee, symbol)}</strong>
          </div>
        </div>
        <div className="sa-settings-stat sa-settings-stat--opd">
          <Stethoscope size={18} aria-hidden />
          <div>
            <span className="sa-settings-stat__label">Consultation</span>
            <strong className="sa-settings-stat__value">
              {formatCurrency(form.default_consultation_fee, symbol)}
            </strong>
          </div>
        </div>
        <div className="sa-settings-stat sa-settings-stat--opd">
          <Percent size={18} aria-hidden />
          <div>
            <span className="sa-settings-stat__label">{form.gst_label || 'Tax'}</span>
            <strong className="sa-settings-stat__value">{form.gst_percent ?? 0}%</strong>
          </div>
        </div>
      </div>

      <div className="sa-settings-blocks sa-settings-blocks--2">
        <SettingsBlock title="Patient fees" icon={CircleDollarSign} className="sa-settings-block--opd">
          <div className="sa-settings-block__grid">
            <SettingsField
              id="registration_fee"
              label="Patient registration fee (₹)"
              hint="Charged on new registration or when revisit window has expired."
            >
              <Input
                id="registration_fee"
                type="number"
                min={0}
                step={1}
                value={form.registration_fee ?? ''}
                onChange={setNumberField('registration_fee')}
              />
            </SettingsField>
            <SettingsField
              id="default_consultation_fee"
              label="Default consultation fee (₹)"
              hint="Fallback when a doctor has no individual fee."
            >
              <Input
                id="default_consultation_fee"
                type="number"
                min={0}
                step={1}
                value={form.default_consultation_fee ?? ''}
                onChange={setNumberField('default_consultation_fee')}
              />
            </SettingsField>
            <SettingsField id="opd_token_prefix" label="OPD token prefix">
              <Input
                id="opd_token_prefix"
                value={form.opd_token_prefix ?? ''}
                onChange={(e) => setField('opd_token_prefix', e.target.value)}
              />
            </SettingsField>
          </div>
        </SettingsBlock>

        <SettingsBlock title="Tax on bills" icon={Tag} className="sa-settings-block--opd">
          <div className="sa-settings-block__grid">
            <SettingsField id="gst_percent" label="GST / tax rate (%)" hint="Applied to OPD bill subtotal.">
              <Input
                id="gst_percent"
                type="number"
                min={0}
                max={100}
                step={0.1}
                value={form.gst_percent ?? ''}
                onChange={setNumberField('gst_percent')}
              />
            </SettingsField>
            <SettingsField id="gst_label" label="Tax label on bills">
              <Input
                id="gst_label"
                value={form.gst_label ?? ''}
                onChange={(e) => setField('gst_label', e.target.value)}
              />
            </SettingsField>
          </div>
        </SettingsBlock>

        <SettingsBlock title="Revisit rules" icon={RefreshCw} className="sa-settings-block--opd sa-settings-block--wide">
          <div className="sa-settings-block__grid sa-settings-block__grid--revisit">
            <SettingsField
              id="revisit_window_days"
              label="Revisit window (days)"
              hint="Returning patients within this period may skip registration fee."
            >
              <Input
                id="revisit_window_days"
                type="number"
                min={1}
                max={365}
                value={form.revisit_window_days ?? ''}
                onChange={setNumberField('revisit_window_days')}
              />
            </SettingsField>
            <label className={`sa-settings-toggle-card${form.waive_registration_fee_on_revisit ? ' sa-settings-toggle-card--on' : ''}`}>
              <input
                type="checkbox"
                className="sa-settings-toggle-card__input"
                checked={Boolean(form.waive_registration_fee_on_revisit)}
                onChange={(e) => setField('waive_registration_fee_on_revisit', e.target.checked)}
              />
              <span className="sa-settings-toggle-card__check" aria-hidden />
              <span className="sa-settings-toggle-card__text">
                <strong>Waive registration fee on revisit</strong>
                <span>Eligible patients within the revisit window skip the registration charge.</span>
              </span>
            </label>
          </div>
        </SettingsBlock>
      </div>
    </div>
  );
}

export function PaymentSettingsSection({ form, setField, togglePaymentMode }) {
  const enabledCount = (form.payment_modes ?? []).length;

  return (
    <div className="sa-settings-layout">
      <div className="sa-settings-hero sa-settings-hero--payment">
        <div className="sa-settings-hero__content">
          <p className="sa-settings-hero__eyebrow">Currency</p>
          <h2 className="sa-settings-hero__title">
            {form.currency_symbol ?? '₹'} {form.currency_code ?? 'INR'}
          </h2>
          <p className="sa-settings-hero__desc">
            {enabledCount} of {HOSPITAL_SETTINGS_PAYMENT_MODES.length} payment modes enabled
          </p>
        </div>
        <div className="sa-settings-hero__aside">
          <SettingsField id="currency_code" label="Currency code">
            <Input
              id="currency_code"
              value={form.currency_code ?? ''}
              onChange={(e) => setField('currency_code', e.target.value)}
            />
          </SettingsField>
          <SettingsField id="currency_symbol" label="Symbol">
            <Input
              id="currency_symbol"
              value={form.currency_symbol ?? ''}
              onChange={(e) => setField('currency_symbol', e.target.value)}
            />
          </SettingsField>
        </div>
      </div>

      <SettingsBlock title="Enabled payment modes" icon={Banknote} className="sa-settings-block--payment sa-settings-block--wide">
        <div className="sa-settings-mode-grid">
          {HOSPITAL_SETTINGS_PAYMENT_MODES.map((mode) => {
            const meta = PAYMENT_MODE_META[mode] ?? { icon: Banknote, tone: 'slate' };
            const Icon = meta.icon;
            const isOn = (form.payment_modes ?? []).includes(mode);
            return (
              <button
                key={mode}
                type="button"
                className={`sa-settings-mode-card sa-settings-mode-card--${meta.tone}${isOn ? ' sa-settings-mode-card--on' : ''}`}
                onClick={() => togglePaymentMode(mode)}
                aria-pressed={isOn}
              >
                <span className="sa-settings-mode-card__icon" aria-hidden>
                  <Icon size={20} strokeWidth={2} />
                </span>
                <span className="sa-settings-mode-card__label">{mode}</span>
                <span className="sa-settings-mode-card__state">{isOn ? 'Enabled' : 'Off'}</span>
              </button>
            );
          })}
        </div>
      </SettingsBlock>
    </div>
  );
}

export function OperationsSettingsSection({ form, setField, setNumberField }) {
  const wardList = (form.ward_types ?? '')
    .split(',')
    .map((w) => w.trim())
    .filter(Boolean);

  return (
    <div className="sa-settings-layout">
      <div className="sa-settings-stats sa-settings-stats--operations">
        <div className="sa-settings-stat sa-settings-stat--operations sa-settings-stat--highlight">
          <BedDouble size={20} aria-hidden />
          <div>
            <span className="sa-settings-stat__label">Bed capacity</span>
            <strong className="sa-settings-stat__value">{form.bed_capacity ?? 0}</strong>
          </div>
        </div>
        <div className="sa-settings-stat sa-settings-stat--operations">
          <CalendarClock size={18} aria-hidden />
          <div>
            <span className="sa-settings-stat__label">Weekdays</span>
            <strong className="sa-settings-stat__value sa-settings-stat__value--sm">
              {form.working_hours_weekday || '—'}
            </strong>
          </div>
        </div>
        <div className="sa-settings-stat sa-settings-stat--operations">
          <Clock size={18} aria-hidden />
          <div>
            <span className="sa-settings-stat__label">Weekends</span>
            <strong className="sa-settings-stat__value sa-settings-stat__value--sm">
              {form.working_hours_weekend || '—'}
            </strong>
          </div>
        </div>
      </div>

      <div className="sa-settings-blocks sa-settings-blocks--2">
        <SettingsBlock title="Working hours" icon={Clock} className="sa-settings-block--operations">
          <div className="sa-settings-block__grid">
            <SettingsField id="working_hours_weekday" label="Weekday hours">
              <Input
                id="working_hours_weekday"
                placeholder="08:00 - 20:00"
                value={form.working_hours_weekday ?? ''}
                onChange={(e) => setField('working_hours_weekday', e.target.value)}
              />
            </SettingsField>
            <SettingsField id="working_hours_weekend" label="Weekend hours">
              <Input
                id="working_hours_weekend"
                placeholder="09:00 - 16:00"
                value={form.working_hours_weekend ?? ''}
                onChange={(e) => setField('working_hours_weekend', e.target.value)}
              />
            </SettingsField>
          </div>
        </SettingsBlock>

        <SettingsBlock title="Capacity & wards" icon={BedDouble} className="sa-settings-block--operations">
          <div className="sa-settings-block__grid">
            <SettingsField id="bed_capacity" label="Total bed capacity">
              <Input
                id="bed_capacity"
                type="number"
                min={0}
                value={form.bed_capacity ?? ''}
                onChange={setNumberField('bed_capacity')}
              />
            </SettingsField>
            <SettingsField
              id="ward_types"
              label="Ward types"
              hint="Comma-separated: General, ICU, Private, Pediatric"
            >
              <Input
                id="ward_types"
                value={form.ward_types ?? ''}
                onChange={(e) => setField('ward_types', e.target.value)}
              />
            </SettingsField>
          </div>
          {wardList.length > 0 ? (
            <div className="sa-settings-tags" aria-label="Ward types preview">
              {wardList.map((ward) => (
                <span key={ward} className="sa-settings-tag sa-settings-tag--operations">
                  {ward}
                </span>
              ))}
            </div>
          ) : null}
        </SettingsBlock>
      </div>
    </div>
  );
}

export function WardRatesSettingsSection({ form, setNumberField }) {
  const symbol = form.currency_symbol ?? '₹';

  return (
    <div className="sa-settings-layout">
      <div className="sa-settings-rate-grid">
        {WARD_RATE_META.map((ward) => (
          <article
            key={ward.key}
            className={`sa-settings-rate-card sa-settings-rate-card--${ward.tone}`}
          >
            <header className="sa-settings-rate-card__head">
              <h3 className="sa-settings-rate-card__title">{ward.label}</h3>
              <p className="sa-settings-rate-card__sub">{ward.sub}</p>
            </header>
            <div className="sa-settings-rate-card__amount">
              <span className="sa-settings-rate-card__symbol">{symbol}</span>
              <Input
                id={ward.key}
                type="number"
                min={0}
                className="sa-settings-rate-card__input"
                value={form[ward.key] ?? ''}
                onChange={setNumberField(ward.key)}
                aria-label={`${ward.label} daily rate`}
              />
              <span className="sa-settings-rate-card__unit">/ day</span>
            </div>
            <p className="sa-settings-rate-card__preview">
              Preview: {formatCurrency(form[ward.key], symbol)} per day
            </p>
          </article>
        ))}
      </div>
    </div>
  );
}

export function BrandingSettingsSection({ form, setField }) {
  const displayName = form.app_display_name || 'SaffoCare HMS';

  return (
    <div className="sa-settings-layout">
      <div className="sa-settings-brand-layout">
        <div className="sa-settings-brand-preview">
          <p className="sa-settings-hero__eyebrow">App preview</p>
          <div className="sa-settings-brand-mock">
            <div className="sa-settings-brand-mock__sidebar">
              <div className="sa-settings-brand-mock__logo">
                <LayoutDashboard size={16} aria-hidden />
              </div>
              <div className="sa-settings-brand-mock__nav" />
              <div className="sa-settings-brand-mock__nav sa-settings-brand-mock__nav--short" />
            </div>
            <div className="sa-settings-brand-mock__main">
              <header className="sa-settings-brand-mock__header">
                <Palette size={14} aria-hidden />
                <span>{displayName}</span>
              </header>
              <div className="sa-settings-brand-mock__content">
                <div className="sa-settings-brand-mock__line sa-settings-brand-mock__line--wide" />
                <div className="sa-settings-brand-mock__line" />
                <div className="sa-settings-brand-mock__line" />
              </div>
            </div>
          </div>
        </div>

        <SettingsBlock title="Application branding" icon={Award} className="sa-settings-block--branding">
          <SettingsField
            id="app_display_name"
            label="App display name"
            hint="Shown in the sidebar, login screens, and browser title."
            fullWidth
          >
            <Input
              id="app_display_name"
              value={form.app_display_name ?? ''}
              onChange={(e) => setField('app_display_name', e.target.value)}
            />
          </SettingsField>
          <ul className="sa-settings-brand-tips">
            <li>
              <Mail size={14} aria-hidden />
              Keep it short — ideally under 24 characters
            </li>
            <li>
              <Building2 size={14} aria-hidden />
              Hospital name on bills comes from Hospital profile
            </li>
          </ul>
        </SettingsBlock>
      </div>
    </div>
  );
}

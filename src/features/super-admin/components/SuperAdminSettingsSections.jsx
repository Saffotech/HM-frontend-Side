import {
  Award,
  Banknote,
  BedDouble,
  Building2,
  CircleDollarSign,
  Clock,
  Globe,
  Hospital,
  MapPin,
  Percent,
  Phone,
  Receipt,
  Stethoscope,
  Tag,
} from 'lucide-react';
import { Input, Label } from '@/shared/components/common';

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

export function UnsupportedBackendSection({ title, fields = [] }) {
  return (
    <div className="sa-settings-layout">
      <p className="sa-settings-unsupported" role="note">
        These settings are not supported by the current backend API. They are shown for reference only
        and cannot be saved.
      </p>
      {fields.length > 0 ? (
        <SettingsBlock title={title} icon={Clock} className="sa-settings-block--operations">
          <div className="sa-settings-block__grid">
            {fields.map((field) => (
              <SettingsField key={field.id} id={field.id} label={field.label}>
                <Input id={field.id} value="" disabled readOnly placeholder="Not supported by backend" />
              </SettingsField>
            ))}
          </div>
        </SettingsBlock>
      ) : null}
    </div>
  );
}

export function ProfileSettingsSection({ form, setField }) {
  const addressPreview = [
    form.address_line1,
    form.address_line2,
    form.city,
    form.state,
    form.pincode,
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <div className="sa-settings-layout">
      <div className="sa-settings-hero sa-settings-hero--profile">
        <div className="sa-settings-hero__icon" aria-hidden>
          <Hospital size={28} strokeWidth={1.8} />
        </div>
        <div className="sa-settings-hero__content">
          <p className="sa-settings-hero__eyebrow">Live preview</p>
          <h2 className="sa-settings-hero__title">{form.hospital_name || 'Hospital name'}</h2>
          {form.tagline ? (
            <p className="sa-settings-hero__desc">{form.tagline}</p>
          ) : null}
          <p className="sa-settings-hero__desc">
            <MapPin size={14} aria-hidden />
            {addressPreview || 'Address will appear on bills and reports'}
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
            <SettingsField id="tagline" label="Tagline">
              <Input
                id="tagline"
                value={form.tagline ?? ''}
                onChange={(e) => setField('tagline', e.target.value)}
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
            <SettingsField id="registration_number" label="Registration number">
              <Input
                id="registration_number"
                value={form.registration_number ?? ''}
                onChange={(e) => setField('registration_number', e.target.value)}
              />
            </SettingsField>
          </div>
        </SettingsBlock>

        <SettingsBlock title="Contact" icon={Phone} className="sa-settings-block--profile">
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
          </div>
        </SettingsBlock>

        <SettingsBlock title="Address" icon={MapPin} className="sa-settings-block--profile sa-settings-block--wide">
          <div className="sa-settings-block__grid">
            <SettingsField id="address_line1" label="Address line 1" fullWidth>
              <Input
                id="address_line1"
                value={form.address_line1 ?? ''}
                onChange={(e) => setField('address_line1', e.target.value)}
              />
            </SettingsField>
            <SettingsField id="address_line2" label="Address line 2" fullWidth>
              <Input
                id="address_line2"
                value={form.address_line2 ?? ''}
                onChange={(e) => setField('address_line2', e.target.value)}
              />
            </SettingsField>
            <SettingsField id="city" label="City">
              <Input
                id="city"
                value={form.city ?? ''}
                onChange={(e) => setField('city', e.target.value)}
              />
            </SettingsField>
            <SettingsField id="state" label="State">
              <Input
                id="state"
                value={form.state ?? ''}
                onChange={(e) => setField('state', e.target.value)}
              />
            </SettingsField>
            <SettingsField id="pincode" label="Pincode">
              <Input
                id="pincode"
                value={form.pincode ?? ''}
                onChange={(e) => setField('pincode', e.target.value)}
              />
            </SettingsField>
          </div>
        </SettingsBlock>

        <SettingsBlock title="Legal / tax IDs" icon={Tag} className="sa-settings-block--profile sa-settings-block--wide">
          <div className="sa-settings-block__grid">
            <SettingsField id="gstin" label="GSTIN">
              <Input
                id="gstin"
                value={form.gstin ?? ''}
                onChange={(e) => setField('gstin', e.target.value)}
              />
            </SettingsField>
            <SettingsField id="pan" label="PAN">
              <Input
                id="pan"
                value={form.pan ?? ''}
                onChange={(e) => setField('pan', e.target.value)}
              />
            </SettingsField>
          </div>
        </SettingsBlock>
      </div>
    </div>
  );
}

export function OpdSettingsSection({ form, setNumberField }) {
  const symbol = form.currency_code === 'INR' ? '₹' : form.currency_code || '₹';

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
            <span className="sa-settings-stat__label">GST</span>
            <strong className="sa-settings-stat__value">{form.gst_percent ?? 0}%</strong>
          </div>
        </div>
      </div>

      <div className="sa-settings-blocks sa-settings-blocks--2">
        <SettingsBlock title="Patient fees" icon={CircleDollarSign} className="sa-settings-block--opd">
          <div className="sa-settings-block__grid">
            <SettingsField
              id="registration_fee"
              label="Patient registration fee"
              hint="Default registration fee for OPD."
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
              label="Default consultation fee"
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
          </div>
        </SettingsBlock>
      </div>
    </div>
  );
}

export function PaymentSettingsSection({ form, setField }) {
  return (
    <div className="sa-settings-layout">
      <div className="sa-settings-hero sa-settings-hero--payment">
        <div className="sa-settings-hero__content">
          <p className="sa-settings-hero__eyebrow">Currency</p>
          <h2 className="sa-settings-hero__title">{form.currency_code ?? 'INR'}</h2>
          <p className="sa-settings-hero__desc">Timezone: {form.timezone ?? 'Asia/Kolkata'}</p>
        </div>
        <div className="sa-settings-hero__aside">
          <SettingsField id="currency_code" label="Currency code">
            <Input
              id="currency_code"
              value={form.currency_code ?? ''}
              onChange={(e) => setField('currency_code', e.target.value)}
            />
          </SettingsField>
          <SettingsField id="timezone" label="Timezone">
            <Input
              id="timezone"
              value={form.timezone ?? ''}
              onChange={(e) => setField('timezone', e.target.value)}
              placeholder="Asia/Kolkata"
            />
          </SettingsField>
        </div>
      </div>

      <SettingsBlock title="Locale" icon={Globe} className="sa-settings-block--payment sa-settings-block--wide">
        <p className="sa-settings-field__hint" style={{ margin: 0 }}>
          Payment modes and currency symbols are not stored in the current backend settings API.
        </p>
      </SettingsBlock>
    </div>
  );
}

export function OperationsSettingsSection() {
  return (
    <UnsupportedBackendSection
      title="Operations preview"
      fields={[
        { id: 'ops_hours_weekday', label: 'Weekday hours' },
        { id: 'ops_hours_weekend', label: 'Weekend hours' },
        { id: 'ops_beds_general', label: 'General ward beds' },
        { id: 'ops_beds_icu', label: 'ICU beds' },
        { id: 'ops_beds_private', label: 'Private ward beds' },
        { id: 'ops_beds_pediatric', label: 'Pediatric ward beds' },
      ]}
    />
  );
}

export function WardRatesSettingsSection() {
  return (
    <UnsupportedBackendSection
      title="Ward daily charges"
      fields={[
        { id: 'ward_rate_general', label: 'General ward / day' },
        { id: 'ward_rate_icu', label: 'ICU / day' },
        { id: 'ward_rate_private', label: 'Private ward / day' },
        { id: 'ward_rate_pediatric', label: 'Pediatric ward / day' },
      ]}
    />
  );
}

export function BrandingSettingsSection() {
  return (
    <div className="sa-settings-layout">
      <UnsupportedBackendSection title="Application branding" fields={[]} />
      <SettingsBlock title="Application branding" icon={Award} className="sa-settings-block--branding">
        <SettingsField id="app_display_name_disabled" label="App display name" fullWidth>
          <Input
            id="app_display_name_disabled"
            value=""
            disabled
            readOnly
            placeholder="Not supported by current backend"
          />
        </SettingsField>
      </SettingsBlock>
    </div>
  );
}

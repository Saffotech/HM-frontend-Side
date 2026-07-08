import { useEffect, useMemo, useState } from 'react';
import { Save } from 'lucide-react';
import {
  BrandingSettingsSection,
  OpdSettingsSection,
  OperationsSettingsSection,
  PaymentSettingsSection,
  ProfileSettingsSection,
  WardRatesSettingsSection,
} from '@/features/super-admin/components/SuperAdminSettingsSections';
import SuperAdminLayout from '@/features/super-admin/components/SuperAdminLayout';
import { getSettings, updateSettings } from '@/features/super-admin/mock/settingsMockService';
import { Button, QueryFeedback } from '@/shared/components/common';
import { toast } from '@/shared/utils/toast';

const SETTINGS_TABS = [
  {
    id: 'profile',
    label: 'Hospital profile',
    description: 'Public hospital identity on bills, reports, and communications.',
  },
  {
    id: 'opd',
    label: 'OPD fees & tax',
    description: 'Registration fee, consultation fee, GST, and revisit rules for OPD.',
  },
  {
    id: 'payment',
    label: 'Payment methods',
    description: 'Payment options on OPD billing, registration, and appointments.',
  },
  {
    id: 'operations',
    label: 'Operations & wards',
    description: 'Working hours, bed capacity, and ward types across the hospital.',
  },
  {
    id: 'ward_rates',
    label: 'Ward daily charges',
    description: 'Daily inpatient rates per ward type (preview — not live yet).',
  },
  {
    id: 'branding',
    label: 'Application branding',
    description: 'Display name shown inside the hospital management app.',
  },
];

const SECTION_RENDERERS = {
  profile: ProfileSettingsSection,
  opd: OpdSettingsSection,
  payment: PaymentSettingsSection,
  operations: OperationsSettingsSection,
  ward_rates: WardRatesSettingsSection,
  branding: BrandingSettingsSection,
};

export default function SuperAdminSettingsPage() {
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState(SETTINGS_TABS[0].id);

  const activeSection = useMemo(
    () => SETTINGS_TABS.find((tab) => tab.id === activeTab) ?? SETTINGS_TABS[0],
    [activeTab],
  );

  const ActiveSection = SECTION_RENDERERS[activeTab];

  useEffect(() => {
    getSettings()
      .then(setForm)
      .catch((e) => setError(e))
      .finally(() => setLoading(false));
  }, []);

  const setField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const setNumberField = (key) => (e) => {
    const raw = e.target.value;
    setField(key, raw === '' ? '' : Number(raw));
  };

  const togglePaymentMode = (mode) => {
    setForm((prev) => {
      const current = prev.payment_modes ?? [];
      const next = current.includes(mode)
        ? current.filter((m) => m !== mode)
        : [...current, mode];
      return { ...prev, payment_modes: next };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        founded_year: Number(form.founded_year) || 0,
        bed_capacity: Number(form.bed_capacity) || 0,
        registration_fee: Number(form.registration_fee) || 0,
        default_consultation_fee: Number(form.default_consultation_fee) || 0,
        gst_percent: Number(form.gst_percent) || 0,
        revisit_window_days: Number(form.revisit_window_days) || 0,
        ward_rate_general: Number(form.ward_rate_general) || 0,
        ward_rate_icu: Number(form.ward_rate_icu) || 0,
        ward_rate_private: Number(form.ward_rate_private) || 0,
        ward_rate_pediatric: Number(form.ward_rate_pediatric) || 0,
      };
      const saved = await updateSettings(payload);
      setForm(saved);
      toast.success('Hospital settings saved (preview — not applied to live modules yet)');
    } catch (err) {
      toast.error(err?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  if (!form) {
    return (
      <SuperAdminLayout pageTitle="Settings">
        <QueryFeedback isLoading={loading} isError={Boolean(error)} error={error} />
      </SuperAdminLayout>
    );
  }

  const sectionProps = { form, setField, setNumberField, togglePaymentMode };

  return (
    <SuperAdminLayout pageTitle="Settings">
      <div className="admin-page sa-settings-page">
        <p className="sa-settings-note" role="note">
          Preview only — values are saved in Super Admin demo until a live settings API is connected.
        </p>

        <QueryFeedback isLoading={loading} isError={Boolean(error)} error={error}>
          <form onSubmit={handleSubmit} className="sa-settings-form">
            <div className="admin-card sa-panel-card sa-settings-shell">
              <div className="sa-settings-shell__toolbar">
                <div>
                  <h1 className="sa-settings-shell__title">Hospital settings</h1>
                  <p className="sa-settings-shell__sub">Configure fees, payments, wards, and profile</p>
                </div>
                <Button type="submit" disabled={saving}>
                  <Save size={16} aria-hidden />
                  {saving ? 'Saving…' : 'Save changes'}
                </Button>
              </div>

              <nav className="sa-settings-tabs" aria-label="Settings sections">
                {SETTINGS_TABS.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    className={`sa-settings-tab sa-settings-tab--${tab.id}${
                      activeTab === tab.id ? ' sa-settings-tab--active' : ''
                    }`}
                    onClick={() => setActiveTab(tab.id)}
                    aria-current={activeTab === tab.id ? 'page' : undefined}
                  >
                    {tab.label}
                  </button>
                ))}
              </nav>

              <div className={`sa-settings-panel sa-settings-panel--${activeSection.id}`}>
                <p className="sa-settings-panel__lead">{activeSection.description}</p>
                <div className="sa-settings-panel__body">
                  {ActiveSection ? <ActiveSection {...sectionProps} /> : null}
                </div>
              </div>
            </div>
          </form>
        </QueryFeedback>
      </div>
    </SuperAdminLayout>
  );
}

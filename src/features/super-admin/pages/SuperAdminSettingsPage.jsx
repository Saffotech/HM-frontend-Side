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
import {
  useSuperAdminSettingsQuery,
  useUpdateSuperAdminSettingsMutation,
} from '@/features/super-admin/hooks/useSuperAdminQuery';
import { Button, QueryFeedback } from '@/shared/components/common';
import { toast } from '@/shared/utils/toast';
import {
  Award,
  Banknote,
  BedDouble,
  Building2,
  CircleDollarSign,
  Receipt,
} from 'lucide-react';

const SETTINGS_TABS = [
  {
    id: 'profile',
    label: 'Hospital profile',
    description: 'Hospital identity, contact details, and legal information.',
    icon: Building2,
  },
  {
    id: 'opd',
    label: 'OPD fees & tax',
    description: 'Default registration fee, consultation fee, and GST for OPD billing.',
    icon: CircleDollarSign,
  },
  {
    id: 'payment',
    label: 'Currency & locale',
    description: 'Currency and timezone used across hospital settings.',
    icon: Banknote,
  },
  {
    id: 'operations',
    label: 'Operations & wards',
    description: 'Ward capacity and working hours (not yet supported by backend).',
    icon: BedDouble,
  },
  {
    id: 'ward_rates',
    label: 'Ward daily charges',
    description: 'Inpatient daily rates (not yet supported by backend).',
    icon: Receipt,
  },
  {
    id: 'branding',
    label: 'Application branding',
    description: 'App display settings (not yet supported by backend).',
    icon: Award,
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
  const settingsQuery = useSuperAdminSettingsQuery();
  const updateMutation = useUpdateSuperAdminSettingsMutation();
  const [form, setForm] = useState(null);
  const [activeTab, setActiveTab] = useState(SETTINGS_TABS[0].id);

  const activeSection = useMemo(
    () => SETTINGS_TABS.find((tab) => tab.id === activeTab) ?? SETTINGS_TABS[0],
    [activeTab],
  );

  const ActiveSection = SECTION_RENDERERS[activeTab];

  useEffect(() => {
    if (settingsQuery.data) {
      setForm(settingsQuery.data);
    }
  }, [settingsQuery.data]);

  const setField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const setNumberField = (key) => (e) => {
    const raw = e.target.value;
    setField(key, raw === '' ? '' : Number(raw));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form) return;
    try {
      const saved = await updateMutation.mutateAsync(form);
      setForm(saved);
      toast.success('Hospital settings saved');
    } catch (err) {
      toast.error(err?.message || 'Save failed');
    }
  };

  const sectionProps = { form, setField, setNumberField };
  const isBackendTab = ['profile', 'opd', 'payment'].includes(activeTab);

  return (
    <SuperAdminLayout pageTitle="Settings">
      <div className="admin-page sa-settings-page">
        <QueryFeedback
          isLoading={settingsQuery.isLoading}
          isError={settingsQuery.isError}
          error={settingsQuery.error}
          onRetry={settingsQuery.refetch}
        >
          {form ? (
            <form onSubmit={handleSubmit} className="sa-settings-form">
              <div className="admin-card sa-panel-card sa-settings-shell">
                <div className="sa-settings-shell__toolbar">
                  <div>
                    <h1 className="sa-settings-shell__title">Hospital settings</h1>
                    <p className="sa-settings-shell__sub">Configure hospital profile and OPD defaults</p>
                  </div>
                  {isBackendTab ? (
                    <Button type="submit" disabled={updateMutation.isPending}>
                      <Save size={16} aria-hidden />
                      {updateMutation.isPending ? 'Saving…' : 'Save changes'}
                    </Button>
                  ) : null}
                </div>

                <nav className="sa-settings-nav" aria-label="Settings sections">
                  {SETTINGS_TABS.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        className={`sa-settings-nav-card sa-settings-nav-card--${tab.id}${
                          isActive ? ' sa-settings-nav-card--active' : ''
                        }`}
                        onClick={() => setActiveTab(tab.id)}
                        aria-current={isActive ? 'page' : undefined}
                      >
                        <span className="sa-settings-nav-card__icon" aria-hidden>
                          <Icon size={20} strokeWidth={2} />
                        </span>
                        <span className="sa-settings-nav-card__text">
                          <span className="sa-settings-nav-card__label">{tab.label}</span>
                        </span>
                      </button>
                    );
                  })}
                </nav>

                <div className={`sa-settings-panel sa-settings-panel--${activeSection.id}`}>
                  <p className="sa-settings-panel__lead">{activeSection.description}</p>
                  <div className="sa-settings-panel__body">
                    {ActiveSection ? <ActiveSection {...sectionProps} /> : null}
                  </div>
                </div>
              </div>
            </form>
          ) : null}
        </QueryFeedback>
      </div>
    </SuperAdminLayout>
  );
}

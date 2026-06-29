import { PATIENT_PROFILE_TABS } from '@/features/opd/utils/patientProfileConstants';

export default function PatientProfileTabNav({ activeTab, onChange, tabCounts = {} }) {
  return (
    <nav className="pp-tabs" role="tablist" aria-label="Patient sections">
      {PATIENT_PROFILE_TABS.map((tab) => {
        const Icon = tab.icon;
        const count = tabCounts[tab.id];
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            className={`pp-tab ${activeTab === tab.id ? 'pp-tab--active' : ''}`}
            onClick={() => onChange(tab.id)}
          >
            <Icon size={16} aria-hidden />
            {tab.label}
            {count != null && count > 0 && (
              <span className="pp-tab__badge">{count}</span>
            )}
          </button>
        );
      })}
    </nav>
  );
}

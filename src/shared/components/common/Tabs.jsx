import './Tabs.css';

export default function Tabs({ tabs, activeTab, onChange }) {
  return (
    <div className="tabs" role="tablist">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={activeTab === tab.id}
          className={`tabs__item ${activeTab === tab.id ? 'tabs__item--active' : ''}`}
          onClick={() => onChange(tab.id)}
        >
          {tab.icon && <tab.icon size={16} />}
          {tab.label}
          {tab.count != null && <span className="tabs__count">{tab.count}</span>}
        </button>
      ))}
    </div>
  );
}

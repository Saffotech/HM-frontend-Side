import './Stats.css';

const STATS = [
  { value: '50+', label: 'Doctors' },
  { value: '20+', label: 'Departments' },
  { value: '5K+', label: 'Patients Managed' },
  { value: '99.9%', label: 'Uptime' },
];

export default function Stats() {
  return (
    <section className="landing-stats">
      <div className="landing-container">
        <div className="landing-stats__grid landing-card">
          {STATS.map((s) => (
            <div key={s.label} className="landing-stats__item">
              <p className="landing-stats__value landing-text-gradient">{s.value}</p>
              <p className="landing-stats__label">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

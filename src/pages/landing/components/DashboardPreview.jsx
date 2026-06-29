import { useState } from 'react';
import {
  Activity,
  CalendarCheck,
  CircleDollarSign,
  Stethoscope,
  TrendingUp,
  Users,
} from 'lucide-react';
import dashboardAdmin from '@/assets/dashboard-admin.png';
import dashboardDoctor from '@/assets/dashboard-doctor.png';
import dashboardReception from '@/assets/dashboard-reception.png';
import './DashboardPreview.css';

const TABS = [
  { id: 'admin', label: 'Admin', img: dashboardAdmin },
  { id: 'doctor', label: 'Doctor', img: dashboardDoctor },
  { id: 'reception', label: 'Reception', img: dashboardReception },
];

const WIDGETS = [
  { icon: Users, label: 'Total Patients', value: '12,486' },
  { icon: CalendarCheck, label: "Today's Appointments", value: '128' },
  { icon: CircleDollarSign, label: 'Revenue (MTD)', value: '$284K' },
  { icon: Stethoscope, label: 'Available Doctors', value: '52' },
  { icon: Activity, label: 'Emergency Cases', value: '9' },
  { icon: TrendingUp, label: 'Bed Occupancy', value: '78%' },
];

export default function DashboardPreview() {
  const [active, setActive] = useState('admin');
  const current = TABS.find((t) => t.id === active) ?? TABS[0];

  return (
    <section className="landing-dashboard">
      <div className="landing-container">
        <div className="landing-dashboard__header">
          <span className="landing-badge landing-badge--primary">Dashboards</span>
          <h2 className="landing-section-title">Powerful Dashboard for Every Department</h2>
          <p className="landing-section-sub">
            A tailored view for admins, doctors, reception and billing — all in real time.
          </p>
        </div>

        <div className="landing-dashboard__tabs" role="tablist">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={active === t.id}
              className={`landing-dashboard__tab${active === t.id ? ' landing-dashboard__tab--active' : ''}`}
              onClick={() => setActive(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="landing-dashboard__preview landing-card">
          <img
            src={current.img}
            alt={`${current.label} dashboard`}
            width={1280}
            height={800}
            loading="eager"
            decoding="async"
            className="landing-dashboard__image"
          />
        </div>

        <div className="landing-dashboard__widgets">
          {WIDGETS.map((w) => (
            <div key={w.label} className="landing-dashboard__widget landing-card">
              <w.icon size={20} className="landing-dashboard__widget-icon" aria-hidden />
              <p className="landing-dashboard__widget-value">{w.value}</p>
              <p className="landing-dashboard__widget-label">{w.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

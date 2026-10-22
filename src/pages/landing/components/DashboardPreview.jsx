import { useState } from 'react';
import dashboardAdmin from '@/assets/Admin1.png';
import dashboardDoctor from '@/assets/Doctor2.png';
import dashboardReception from '@/assets/Receptionist1.png';
import dashboardSuperAdmin from '@/assets/Super_Admin1.png';
import dashboardOpd from '@/assets/OPD1.png';
import dashboardNurse from '@/assets/Nurse1.png';
import dashboardLab from '@/assets/Lab1.png';
import dashboardPharmacy from '@/assets/Pharmacy1.png';
import './DashboardPreview.css';

const TABS = [
  { id: 'super-admin', label: 'Super Admin', img: dashboardSuperAdmin },
  { id: 'admin', label: 'Admin', img: dashboardAdmin },
  { id: 'opd', label: 'OPD', img: dashboardOpd },
  { id: 'doctor', label: 'Doctor', img: dashboardDoctor },
  { id: 'nurse', label: 'Nurse', img: dashboardNurse },
  { id: 'lab', label: 'Lab', img: dashboardLab },
  { id: 'receptionist', label: 'Receptionist', img: dashboardReception },
  { id: 'pharmacy', label: 'Pharmacy', img: dashboardPharmacy },
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
            A tailored view for every hospital role — all in real time.
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
          {current.img ? (
            <img
              src={current.img}
              alt={`${current.label} dashboard`}
              width={1280}
              height={800}
              loading="eager"
              decoding="async"
              className="landing-dashboard__image"
            />
          ) : (
            <div className="landing-dashboard__coming-soon" role="status">
              <p className="landing-dashboard__coming-soon-title">Coming Soon</p>
              <p className="landing-dashboard__coming-soon-sub">
                {current.label} dashboard preview will be available soon.
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

import {
  Activity,
  BedDouble,
  ClipboardList,
  LayoutDashboard,
  Pill,
  ShieldCheck,
  Stethoscope,
  Users,
} from 'lucide-react';
import './WhyUs.css';

const POINTS = [
  { icon: ClipboardList, text: 'End-to-end OPD & billing workflow' },
  { icon: Users, text: 'Multi-role access — Admin to Pharmacy' },
  { icon: Stethoscope, text: 'Clinical workflows for Doctor, Nurse & Lab' },
  { icon: Pill, text: 'Pharmacy dispense & inventory management' },
  { icon: BedDouble, text: 'Bed & appointment management' },
  { icon: LayoutDashboard, text: 'Role-based dashboards for every department' },
  { icon: ShieldCheck, text: 'Secure login with role-based permissions' },
  { icon: Activity, text: 'One platform for all hospital departments' },
];

export default function WhyUs() {
  return (
    <section id="why-us" className="landing-why">
      <div className="landing-container">
        <div className="landing-why__header">
          <h2 className="landing-section-title">Why Hospitals Choose Our System</h2>
          <p className="landing-section-sub">
            Built for real hospital operations — from front desk to pharmacy — in one secure platform.
          </p>
        </div>
        <div className="landing-why__grid">
          {POINTS.map((p) => (
            <div key={p.text} className="landing-why__card landing-card">
              <span className="landing-why__icon">
                <p.icon size={20} aria-hidden />
              </span>
              <p>{p.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

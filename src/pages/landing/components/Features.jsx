import { Link } from 'react-router-dom';
import {
  ArrowUpRight,
  Banknote,
  BarChart3,
  Boxes,
  CalendarClock,
  ClipboardList,
  FlaskConical,
  Microscope,
  Pill,
  Stethoscope,
  Users,
} from 'lucide-react';
import { ROUTES } from '@/shared/constants';
import './Features.css';

const FEATURES = [
  {
    icon: Users,
    title: 'Patient Management',
    desc: 'Registration, medical history, digital records, emergency contacts, insurance & visit history.',
    to: ROUTES.PATIENT_LOGIN,
  },
  {
    icon: Stethoscope,
    title: 'Doctor Management',
    desc: 'Profiles, department assignment, availability, consultations, prescriptions & performance.',
    to: ROUTES.LOGIN,
  },
  {
    icon: CalendarClock,
    title: 'Appointment Management',
    desc: 'Online booking, scheduling, queue, SMS/email reminders, and rescheduling.',
    to: ROUTES.PATIENT_LOGIN,
  },
  {
    icon: ClipboardList,
    title: 'Electronic Medical Records',
    desc: 'Diagnosis, treatments, prescriptions, lab reports, clinical notes & allergies.',
    to: ROUTES.LOGIN,
  },
  {
    icon: Banknote,
    title: 'Billing & Invoicing',
    desc: 'Invoices, insurance billing, payment tracking, tax, refunds & financial reports.',
    to: ROUTES.LOGIN,
  },
  {
    icon: Pill,
    title: 'Pharmacy Management',
    desc: 'Medicine inventory, prescription integration, stock alerts, expiry & suppliers.',
    to: ROUTES.LOGIN,
  },
  {
    icon: FlaskConical,
    title: 'Laboratory Management',
    desc: 'Test booking, sample tracking, result management, and report generation.',
    to: ROUTES.LOGIN,
  },
  {
    icon: Microscope,
    title: 'Staff & HR Management',
    desc: 'Employee records, attendance, payroll, shifts and leave management.',
    to: ROUTES.LOGIN,
  },
  {
    icon: Boxes,
    title: 'Inventory Management',
    desc: 'Medical equipment tracking, stock, purchase orders & vendor management.',
    to: ROUTES.LOGIN,
  },
  {
    icon: BarChart3,
    title: 'Reports & Analytics',
    desc: 'Revenue, patient analytics, doctor performance and real-time dashboards.',
    to: ROUTES.LOGIN,
  },
];

export default function Features() {
  return (
    <section id="features" className="landing-features">
      <div className="landing-container">
        <div className="landing-features__header">
          <span className="landing-badge landing-badge--primary">Features</span>
          <h2 className="landing-section-title">Complete Healthcare Management Features</h2>
          <p className="landing-section-sub">
            Every tool your hospital needs to run smoothly — built for clinicians, admins and patients.
          </p>
        </div>
        <div className="landing-features__grid">
          {FEATURES.map((f) => (
            <Link key={f.title} to={f.to} className="landing-features__card landing-card">
              <ArrowUpRight size={16} className="landing-features__arrow" aria-hidden />
              <span className="landing-features__icon">
                <f.icon size={20} aria-hidden />
              </span>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

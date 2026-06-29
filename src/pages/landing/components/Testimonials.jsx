import { Star } from 'lucide-react';
import './Testimonials.css';

const ITEMS = [
  { name: 'Dr. Aisha Khan', role: 'Hospital Administrator', text: 'SaffoCare unified our 14 departments. We cut admin time by 40% in the first quarter.' },
  { name: 'Dr. Marcus Lee', role: 'Cardiologist', text: 'EMR access is instant. Prescriptions, lab results and history — all on one screen.' },
  { name: 'Demo User A', role: 'Reception Lead', text: 'Appointments, check-ins and reminders are effortless. Our patients love the experience.' },
  { name: 'Dr. Samuel Okafor', role: 'Clinic Owner', text: 'Billing and insurance are finally painless. The reporting alone justified the switch.' },
];

function initials(name) {
  return name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('');
}

export default function Testimonials() {
  return (
    <section id="testimonials" className="landing-testimonials">
      <div className="landing-container">
        <div className="landing-testimonials__header">
          <h2 className="landing-section-title">What Healthcare Professionals Say</h2>
        </div>
        <div className="landing-testimonials__grid">
          {ITEMS.map((t) => (
            <figure key={t.name} className="landing-testimonials__card landing-card">
              <div className="landing-testimonials__stars" aria-label="5 out of 5 stars">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} size={16} fill="currentColor" aria-hidden />
                ))}
              </div>
              <blockquote>&ldquo;{t.text}&rdquo;</blockquote>
              <figcaption>
                <span className="landing-testimonials__avatar">{initials(t.name)}</span>
                <div>
                  <p className="landing-testimonials__name">{t.name}</p>
                  <p className="landing-testimonials__role">{t.role}</p>
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

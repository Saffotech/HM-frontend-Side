import { useState } from 'react';
import { Clock, Mail, MapPin, Phone } from 'lucide-react';
import { toast } from '@/shared/utils/toast';
import './Contact.css';

/**
 * Landing contact block — product inquiry for hospitals evaluating SaffoCare.
 * Form opens the visitor’s email client (no backend API yet).
 */
const CONTACT_INFO = [
  { icon: Mail, label: 'Email', value: 'sales@saffotech.com', href: 'mailto:sales@saffotech.com' },
  { icon: Phone, label: 'Phone', value: '+91 22 40163618', href: 'tel:+912240163618' },
  { icon: MapPin, label: 'Address', value: 'Navi Mumbai, India' },
  { icon: Clock, label: 'Support Hours', value: 'Mon–Sat, 10:00 AM – 6:00 PM IST' },
];

const ROLE_OPTIONS = [
  'Hospital Admin / Decision Maker',
  'OPD / Front Office',
  'Doctor',
  'Nurse',
  'Lab',
  'Receptionist',
  'Pharmacy',
  'IT / Super Admin',
  'Other',
];

const CONTACT_EMAIL = 'sales@saffotech.com';

export default function Contact() {
  const [form, setForm] = useState({
    name: '',
    hospital: '',
    role: '',
    email: '',
    phone: '',
    message: '',
  });

  const handleSubmit = (e) => {
    e.preventDefault();

    const subject = encodeURIComponent(`SaffoCare inquiry — ${form.hospital || 'Hospital'}`);
    const body = encodeURIComponent(
      [
        `Name: ${form.name}`,
        `Hospital / Clinic: ${form.hospital}`,
        `Role: ${form.role || '—'}`,
        `Email: ${form.email}`,
        `Phone: ${form.phone}`,
        '',
        'Message:',
        form.message,
      ].join('\n'),
    );

    window.location.href = `mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`;
    toast.success('Opening your email app to send the message…');
    setForm({ name: '', hospital: '', role: '', email: '', phone: '', message: '' });
  };

  const update = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  return (
    <section id="contact" className="landing-contact">
      <div className="landing-container landing-contact__grid">
        <div>
          <h2 className="landing-section-title">Contact Us</h2>
          <p className="landing-section-sub">
            Interested in deploying SaffoCare HMS for your hospital? Ask about modules,
            roles (OPD, Doctor, Nurse, Lab, Pharmacy, and more), or a walkthrough with our team.
          </p>
          <ul className="landing-contact__info">
            {CONTACT_INFO.map((c) => (
              <li key={c.label}>
                <span className="landing-contact__icon">
                  <c.icon size={20} aria-hidden />
                </span>
                <div>
                  <p className="landing-contact__label">{c.label}</p>
                  <p className="landing-contact__value">
                    {c.href ? <a href={c.href}>{c.value}</a> : c.value}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <form className="landing-contact__form landing-card" onSubmit={handleSubmit}>
          <div className="landing-contact__fields">
            <div className="landing-contact__field landing-contact__field--full">
              <label htmlFor="contact-name">Full Name</label>
              <input
                id="contact-name"
                required
                placeholder="Your name"
                value={form.name}
                onChange={update('name')}
              />
            </div>
            <div className="landing-contact__field landing-contact__field--full">
              <label htmlFor="contact-hospital">Hospital / Clinic Name</label>
              <input
                id="contact-hospital"
                required
                placeholder="Your hospital or clinic"
                value={form.hospital}
                onChange={update('hospital')}
              />
            </div>
            <div className="landing-contact__field landing-contact__field--full">
              <label htmlFor="contact-role">Your Role</label>
              <select
                id="contact-role"
                required
                className="landing-contact__select"
                value={form.role}
                onChange={update('role')}
              >
                <option value="" disabled>
                  Select your role
                </option>
                {ROLE_OPTIONS.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
            </div>
            <div className="landing-contact__field">
              <label htmlFor="contact-email">Work Email</label>
              <input
                id="contact-email"
                type="email"
                required
                placeholder="you@hospital.com"
                value={form.email}
                onChange={update('email')}
              />
            </div>
            <div className="landing-contact__field">
              <label htmlFor="contact-phone">Phone Number</label>
              <input
                id="contact-phone"
                required
                placeholder="+91 98765 43210"
                value={form.phone}
                onChange={update('phone')}
              />
            </div>
            <div className="landing-contact__field landing-contact__field--full">
              <label htmlFor="contact-message">How can we help?</label>
              <textarea
                id="contact-message"
                required
                placeholder="Tell us about your hospital size, modules you need (OPD, Nurse, Lab, Pharmacy…), or schedule a product walkthrough."
                rows={5}
                value={form.message}
                onChange={update('message')}
              />
            </div>
          </div>
          <button type="submit" className="landing-btn landing-btn--primary landing-btn--lg landing-contact__submit">
            Send Message
          </button>
        </form>
      </div>
    </section>
  );
}

import { useState } from 'react';
import { Clock, Mail, MapPin, Phone } from 'lucide-react';
import { toast } from '@/shared/utils/toast';
import './Contact.css';

const CONTACT_INFO = [
  { icon: Mail, label: 'Email', value: 'sales@saffocare.com' },
  { icon: Phone, label: 'Phone', value: '+1 (800) 555-0119' },
  { icon: MapPin, label: 'Address', value: '120 Health Plaza, Suite 400, San Francisco, CA' },
  { icon: Clock, label: 'Support Hours', value: '24 / 7 — every day of the year' },
];

export default function Contact() {
  const [form, setForm] = useState({ name: '', hospital: '', email: '', phone: '', message: '' });

  const handleSubmit = (e) => {
    e.preventDefault();
    toast.success('Thanks! Our team will reach out within 24 hours.');
    setForm({ name: '', hospital: '', email: '', phone: '', message: '' });
  };

  const update = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  return (
    <section id="contact" className="landing-contact">
      <div className="landing-container landing-contact__grid">
        <div>
          <h2 className="landing-section-title">Let&apos;s transform your hospital</h2>
          <p className="landing-section-sub">
            Talk to our team for a personalized demo of SaffoCare.
          </p>
          <ul className="landing-contact__info">
            {CONTACT_INFO.map((c) => (
              <li key={c.label}>
                <span className="landing-contact__icon">
                  <c.icon size={20} aria-hidden />
                </span>
                <div>
                  <p className="landing-contact__label">{c.label}</p>
                  <p className="landing-contact__value">{c.value}</p>
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
                placeholder="Jane Doe"
                value={form.name}
                onChange={update('name')}
              />
            </div>
            <div className="landing-contact__field landing-contact__field--full">
              <label htmlFor="contact-hospital">Hospital Name</label>
              <input
                id="contact-hospital"
                required
                placeholder="St. Mary's Hospital"
                value={form.hospital}
                onChange={update('hospital')}
              />
            </div>
            <div className="landing-contact__field">
              <label htmlFor="contact-email">Email</label>
              <input
                id="contact-email"
                type="email"
                required
                placeholder="jane@hospital.com"
                value={form.email}
                onChange={update('email')}
              />
            </div>
            <div className="landing-contact__field">
              <label htmlFor="contact-phone">Phone Number</label>
              <input
                id="contact-phone"
                required
                placeholder="+1 555 000 0000"
                value={form.phone}
                onChange={update('phone')}
              />
            </div>
            <div className="landing-contact__field landing-contact__field--full">
              <label htmlFor="contact-message">Message</label>
              <textarea
                id="contact-message"
                required
                placeholder="Tell us about your hospital..."
                rows={5}
                value={form.message}
                onChange={update('message')}
              />
            </div>
          </div>
          <button type="submit" className="landing-btn landing-btn--primary landing-btn--lg landing-contact__submit">
            Request Demo
          </button>
        </form>
      </div>
    </section>
  );
}

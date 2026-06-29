import { DatabaseBackup, Eye, Fingerprint, KeyRound, Lock, ScrollText } from 'lucide-react';
import './Security.css';

const ITEMS = [
  { icon: Lock, title: 'Data encryption', desc: 'AES-256 at rest, TLS 1.3 in transit.' },
  { icon: KeyRound, title: 'Role-based access', desc: 'Granular permissions per department.' },
  { icon: Fingerprint, title: 'Secure authentication', desc: 'SSO, MFA and session controls.' },
  { icon: DatabaseBackup, title: 'Daily backups', desc: 'Automated snapshots & disaster recovery.' },
  { icon: ScrollText, title: 'Audit logs', desc: 'Track every action across the system.' },
  { icon: Eye, title: 'Privacy protection', desc: 'HIPAA-aligned controls & data minimization.' },
];

export default function Security() {
  return (
    <section className="landing-security">
      <div className="landing-container">
        <div className="landing-security__header">
          <h2 className="landing-section-title">Enterprise-Level Security & Compliance</h2>
          <p className="landing-section-sub">
            Patient data deserves the strongest protection. We built SaffoCare that way.
          </p>
        </div>
        <div className="landing-security__grid">
          {ITEMS.map((i) => (
            <div key={i.title} className="landing-security__card landing-card">
              <span className="landing-security__icon">
                <i.icon size={20} aria-hidden />
              </span>
              <h3>{i.title}</h3>
              <p>{i.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

import { Cloud, Gauge, Headphones, Layers, Lock, ShieldCheck, Users, Zap } from 'lucide-react';
import './WhyUs.css';

const POINTS = [
  { icon: Cloud, text: 'Secure cloud-based platform' },
  { icon: Zap, text: 'Easy-to-use interface' },
  { icon: Gauge, text: 'Fast patient management' },
  { icon: Layers, text: 'Real-time reporting' },
  { icon: Users, text: 'Multi-role access control' },
  { icon: ShieldCheck, text: 'HIPAA-ready architecture' },
  { icon: Lock, text: 'Scalable for hospitals of all sizes' },
  { icon: Headphones, text: '24/7 technical support' },
];

export default function WhyUs() {
  return (
    <section id="about" className="landing-why">
      <div className="landing-container">
        <div className="landing-why__header">
          <h2 className="landing-section-title">Why Hospitals Choose Our System</h2>
          <p className="landing-section-sub">
            Built with the rigor healthcare demands and the simplicity teams love.
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

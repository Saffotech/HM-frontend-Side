import { Facebook, Instagram, Linkedin, Twitter } from 'lucide-react';
import { APP_NAME } from '@/shared/constants';
import { BrandLogo, BrandName } from '@/shared/components/common';
import './Footer.css';

const COLS = [
  { title: 'Company', links: ['About Us', 'Careers', 'Blog', 'Contact'] },
  { title: 'Product', links: ['Features', 'Pricing', 'Modules', 'Security'] },
  { title: 'Support', links: ['Help Center', 'Documentation', 'FAQ', 'Technical Support'] },
];

const SOCIAL = [
  { Icon: Linkedin, label: 'LinkedIn' },
  { Icon: Facebook, label: 'Facebook' },
  { Icon: Instagram, label: 'Instagram' },
  { Icon: Twitter, label: 'Twitter' },
];

export default function Footer() {
  return (
    <footer className="landing-footer">
      <div className="landing-container">
        <div className="landing-footer__grid">
          <div className="landing-footer__brand-col">
            <div className="landing-footer__brand">
              <BrandLogo size={32} className="landing-footer__logo-img" />
              <BrandName className="landing-footer__title" />
            </div>
            <p className="landing-footer__desc">
              A modern hospital management system to run patient care, doctors, billing and operations from one secure platform.
            </p>
            <div className="landing-footer__social">
              {SOCIAL.map(({ Icon, label }) => (
                <a key={label} href="#home" className="landing-footer__social-link" aria-label={label}>
                  <Icon size={16} aria-hidden />
                </a>
              ))}
            </div>
          </div>
          {COLS.map((c) => (
            <div key={c.title}>
              <h4>{c.title}</h4>
              <ul>
                {c.links.map((l) => (
                  <li key={l}>
                    <a href="#home">{l}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="landing-footer__bottom">
          <p>© {new Date().getFullYear()} {APP_NAME}. All rights reserved.</p>
          <div className="landing-footer__legal">
            <a href="#home">Privacy</a>
            <a href="#home">Terms</a>
            <a href="#home">Cookies</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

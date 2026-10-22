import { Link } from 'react-router-dom';
import { APP_NAME, ROUTES } from '@/shared/constants';
import { BrandLogo, BrandName } from '@/shared/components/common';
import './Footer.css';

const PAGE_LINKS = [
  { to: ROUTES.HOME, label: 'Home' },
  { to: ROUTES.ABOUT, label: 'About Us' },
  { to: `${ROUTES.HOME}#features`, label: 'Features' },
  { to: `${ROUTES.HOME}#modules`, label: 'Modules' },
  { to: `${ROUTES.HOME}#contact`, label: 'Contact Us' },
];

function FooterLink({ to, label }) {
  if (to.includes('#')) {
    return <a href={to}>{label}</a>;
  }
  return <Link to={to}>{label}</Link>;
}

export default function Footer() {
  return (
    <footer className="landing-footer">
      <div className="landing-container landing-footer__inner">
        <div className="landing-footer__row">
          <div className="landing-footer__brand">
            <BrandLogo size={28} className="landing-footer__logo-img" />
            <BrandName className="landing-footer__title" />
          </div>
          <nav className="landing-footer__links" aria-label="Footer">
            {PAGE_LINKS.map((l) => (
              <FooterLink key={l.label} to={l.to} label={l.label} />
            ))}
            <Link to={`${ROUTES.LOGIN}?switch=1`}>Staff Login</Link>
          </nav>
        </div>
        <div className="landing-footer__row landing-footer__row--copyright">
          <p>
            © {new Date().getFullYear()} {APP_NAME}. All rights reserved.
            <span className="landing-footer__sep" aria-hidden>·</span>
            Navi Mumbai, India
            <span className="landing-footer__sep" aria-hidden>·</span>
            <a href="tel:+912240163618">+91 22 40163618</a>
            <span className="landing-footer__sep" aria-hidden>·</span>
            <a href="mailto:sales@saffotech.com">sales@saffotech.com</a>
          </p>
        </div>
      </div>
    </footer>
  );
}

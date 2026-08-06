import { NavLink } from 'react-router-dom';
import { ROUTES } from '@/shared/constants';
import '@/features/admin/styles/nurseWorkforce.css';

const DEFAULT_LINKS = [
  { to: ROUTES.ADMIN_SETTINGS_OPD, label: 'OPD', end: true },
  { to: ROUTES.ADMIN_SETTINGS_DOCTOR, label: 'Doctor' },
  { to: ROUTES.ADMIN_SETTINGS_RECEPTIONIST, label: 'Receptionist' },
  { to: ROUTES.ADMIN_SETTINGS_LAB, label: 'LAB' },
  { to: ROUTES.ADMIN_SETTINGS_NURSE, label: 'NURSE' },
  { to: ROUTES.ADMIN_SETTINGS_PHARMACY, label: 'Pharmacy' },
];

export default function AdminSettingsNav({ links = DEFAULT_LINKS }) {
  return (
    <div className="nwf-subnav-row">
      <nav className="nwf-subnav" aria-label="Settings modules">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.end}
            className={({ isActive }) =>
              `nwf-subnav__link${isActive ? ' is-active' : ''}`
            }
          >
            {link.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

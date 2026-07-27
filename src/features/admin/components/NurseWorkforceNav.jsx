import { NavLink } from 'react-router-dom';
import { ROUTES } from '@/shared/constants';
import '@/features/admin/styles/nurseWorkforce.css';

const LINKS = [
  { to: ROUTES.ADMIN_NURSE_WORKFORCE, label: 'Dashboard', end: true },
  { to: ROUTES.ADMIN_NURSE_WORKFORCE_SHIFTS, label: 'Shifts' },
  { to: ROUTES.ADMIN_NURSE_WORKFORCE_ROSTER, label: 'Roster' },
];

export default function NurseWorkforceNav() {
  return (
    <div className="nwf-subnav-row">
      <nav className="nwf-subnav" aria-label="Nurse workforce sections">
        {LINKS.map((link) => (
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

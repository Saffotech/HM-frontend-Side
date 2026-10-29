import { Link, useNavigate } from 'react-router-dom';
import { ROUTES } from '@/shared/constants';
import { useAuthStore } from '@/shared/store/useAuthStore';
import useLogoutConfirmation from '@/shared/hooks/useLogoutConfirmation';
import Button from './Button';

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuthStore();
  const navigate = useNavigate();
  const logoutConfirmation = useLogoutConfirmation(() => {
    logout();
    navigate(ROUTES.LOGIN);
  });

  return (
    <nav className="navbar">
      <Link to={ROUTES.DASHBOARD} className="navbar__brand">
        Hospital
      </Link>
      {isAuthenticated && (
        <div className="navbar__links">
          <Link to={ROUTES.DASHBOARD}>Dashboard</Link>
          <Link to={ROUTES.DOCTORS}>Doctors</Link>
          <Link to={ROUTES.ROLES}>Roles</Link>
        </div>
      )}
      <div className="navbar__actions">
        {isAuthenticated ? (
          <>
            <span className="navbar__user">{user?.full_name || user?.email}</span>
            <Button variant="secondary" onClick={logoutConfirmation.requestLogout}>
              Logout
            </Button>
          </>
        ) : (
          <Link to={ROUTES.LOGIN}>Login</Link>
        )}
      </div>
      {logoutConfirmation.dialog}
    </nav>
  );
}

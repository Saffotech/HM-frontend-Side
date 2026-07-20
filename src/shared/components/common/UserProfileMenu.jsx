import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, ChevronDown } from 'lucide-react';
import { useAuthStore } from '@/shared/store/useAuthStore';
import { ROUTES } from '@/shared/constants';
import Avatar from './Avatar';
import './UserProfileMenu.css';

/**
 * Doctor Phase 2 by Atharva —
 * Doctor UX: clicking the name opens the profile page (no "My Profile" menu item).
 * When already on the profile page (`logoutMenuOnly`), the same control opens a
 * logout-only dropdown. Other roles keep the default logout dropdown.
 */
export default function UserProfileMenu({
  compact = false,
  className = '',
  profileHref = null,
  logoutMenuOnly = false,
}) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const displayName = user?.full_name || user?.email || 'User';
  const email = user?.email || '';
  const roleLabel =
    user?.department ||
    (user?.role === 'admin'
      ? 'Administration'
      : user?.role === 'doctor'
      ? 'Doctor'
      : user?.role === 'opd'
        ? 'Billing Counter'
        : user?.role === 'lab_technician'
          ? 'Lab Technician'
          : user?.role === 'pharmacist'
            ? 'Pharmacist'
            : user?.role || 'Staff');

  useEffect(() => {
    const onDocClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const handleLogout = () => {
    logout();
    navigate(ROUTES.HOME);
  };

  const handleTriggerClick = () => {
    // Doctor Phase 2 by Atharva — name click opens profile; on profile page show logout menu
    if (profileHref && !logoutMenuOnly) {
      navigate(profileHref);
      return;
    }
    setOpen((prev) => !prev);
  };

  const showDropdown = open && (logoutMenuOnly || !profileHref);

  return (
    <div className={`user-profile-menu ${className}`} ref={ref}>
      <button
        type="button"
        className={`user-profile-menu__trigger ${compact ? 'user-profile-menu__trigger--compact' : ''}`}
        onClick={handleTriggerClick}
        aria-expanded={showDropdown}
        aria-haspopup={showDropdown || logoutMenuOnly ? 'true' : undefined}
        title={profileHref && !logoutMenuOnly ? 'Open profile' : undefined}
      >
        <Avatar name={displayName} size={compact ? 32 : 36} className="avatar--primary" />
        {!compact && (
          <>
            <span className="user-profile-menu__name">{displayName}</span>
            {(logoutMenuOnly || !profileHref) && (
              <ChevronDown
                size={16}
                className={`user-profile-menu__chev ${showDropdown ? 'user-profile-menu__chev--open' : ''}`}
              />
            )}
          </>
        )}
      </button>

      {showDropdown && (
        <div className="user-profile-menu__dropdown" role="menu">
          <div className="user-profile-menu__info">
            <p className="user-profile-menu__info-name">{displayName}</p>
            <p className="user-profile-menu__info-email">{email}</p>
            <p className="user-profile-menu__info-role">{roleLabel}</p>
          </div>
          <button type="button" className="user-profile-menu__logout" onClick={handleLogout} role="menuitem">
            <LogOut size={16} aria-hidden />
            Log out
          </button>
        </div>
      )}
    </div>
  );
}

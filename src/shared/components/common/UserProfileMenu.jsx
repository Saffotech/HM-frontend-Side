import { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, ChevronDown } from 'lucide-react';
import { useAuthStore } from '@/shared/store/useAuthStore';
import { ROUTES } from '@/shared/constants';
import { resolveMediaUrl } from '@/shared/utils/resolveMediaUrl';
import { getRoleLabel, toTitleCase } from '@/shared/utils/roleUtils';
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

  const displayName = toTitleCase(user?.full_name) || user?.email || 'User';
  const email = user?.email || '';
  const avatarSrc = useMemo(
    () => resolveMediaUrl(user?.profile_image_url),
    [user?.profile_image_url]
  );
  // The chip identifies the module the user is signed in as; the person's own
  // name and email stay in the dropdown.
  const roleLabel = getRoleLabel(user);

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
        title={
          profileHref && !logoutMenuOnly ? `Open profile — ${displayName}` : displayName
        }
      >
        <Avatar
          name={displayName}
          src={avatarSrc}
          size={compact ? 32 : 36}
          className="avatar--primary"
        />
        {!compact && (
          <>
            <span className="user-profile-menu__name">{roleLabel}</span>
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
            <div className="user-profile-menu__info-top">
              <Avatar
                name={displayName}
                src={avatarSrc}
                size={44}
                className="avatar--primary user-profile-menu__info-avatar"
              />
              <div className="user-profile-menu__info-text">
                <p className="user-profile-menu__info-name">{displayName}</p>
                {email ? <p className="user-profile-menu__info-email">{email}</p> : null}
              </div>
            </div>
            <span className="user-profile-menu__info-role">{roleLabel}</span>
          </div>
          <div className="user-profile-menu__footer">
            <button type="button" className="user-profile-menu__logout" onClick={handleLogout} role="menuitem">
              <LogOut size={16} aria-hidden />
              Log out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Lock, Mail, ShieldCheck, UserCog } from 'lucide-react';
import { ROUTES, ROLES } from '@/shared/constants';
import { BrandLogo, BrandName } from '@/shared/components/common';
import { useAuthStore } from '@/shared/store/useAuthStore';
import { isSupersededSessionError } from '@/components/security/httpSessionPolicy';
import { isStaffModuleLive } from '@/shared/constants/moduleAvailability';
import { trimCredentials, hasCredentials, normalizeEmailInput } from '@/shared/utils/credentials';
import { toast } from '@/shared/utils/toast';
import '@/features/manager/styles/manager-login.css';

/* Legacy identifier preserved: AdminLoginPage. Active name: ManagerLoginPage. */
export default function ManagerLoginPage() {
  const { login, logout, error, isAuthenticated, user, authReady } = useAuthStore();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (!authReady || !isAuthenticated || !user) return;
    if (user.role === ROLES.SUPER_ADMIN) {
      navigate(ROUTES.SUPER_ADMIN_DASHBOARD, { replace: true });
      return;
    }
    if (user.role === ROLES.ADMIN) {
      navigate(ROUTES.ADMIN_DASHBOARD, { replace: true });
      return;
    }
    if (user.role === ROLES.MANAGER) {
      navigate(ROUTES.MANAGER_DASHBOARD, { replace: true });
      return;
    }
    navigate(ROUTES.LOGIN, { replace: true });
  }, [authReady, isAuthenticated, user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    const trimmed = trimCredentials({ email, password });
    if (!hasCredentials(trimmed)) {
      setFormError('Please enter your email and password');
      return;
    }

    setSubmitting(true);
    try {
      const me = await login(trimmed);

      if (me.role !== ROLES.MANAGER) {
        logout();
        const blocked = 'This portal is for manager accounts only.';
        setFormError(blocked);
        toast.error(blocked);
        return;
      }

      if (!isStaffModuleLive(me.department, me.role)) {
        logout();
        const blocked = `${me.department || 'Management'} is not available yet.`;
        setFormError(blocked);
        toast.error(blocked);
        return;
      }

      toast.success(`Welcome, ${me.full_name}`);
      navigate(ROUTES.MANAGER_DASHBOARD, { replace: true });
    } catch (err) {
      if (isSupersededSessionError(err)) return;
      const message =
        err?.status === 401
          ? 'Invalid email or password'
          : err?.message || 'Unable to sign in. Please try again.';
      setFormError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const displayError = formError || error;

  return (
    <div className="admin-login-page">
      <div className="admin-login-page__frame">
        <aside className="admin-login-page__hero" aria-label="SaffoCare manager portal">
          <Link to={ROUTES.HOME} className="admin-login-page__back">
            <ArrowLeft size={16} aria-hidden />
            Back
          </Link>

          <div className="admin-login-page__hero-body">
            <BrandLogo size={48} />
            <h1 className="admin-login-page__hero-title">
              <BrandName variant="on-dark" /> Manager
            </h1>
            <p className="admin-login-page__hero-lead">
              Enterprise console for staff lifecycle, departments, roles, and hospital reports.
            </p>
          </div>

          <div className="admin-login-page__hero-foot">
            <span>
              <ShieldCheck size={14} aria-hidden />
              Role-based permissions
            </span>
            <span>
              <UserCog size={14} aria-hidden />
              Staff lifecycle management
            </span>
          </div>
        </aside>

        <section className="admin-login-page__form-panel" aria-labelledby="admin-sign-in-title">
          <Link to={ROUTES.HOME} className="admin-login-page__back admin-login-page__back--mobile">
            <ArrowLeft size={16} aria-hidden />
            Back
          </Link>

          <div className="admin-login-page__form-panel-inner">
            <header className="admin-login-page__form-head">
              <h2 id="admin-sign-in-title">Manager sign in</h2>
              <p>Sign in with your manager account registered in the hospital system.</p>
            </header>

            <form className="admin-login-page__form" onSubmit={handleSubmit}>
              <div className="admin-login-page__field">
                <label htmlFor="admin-email">Work email</label>
                <div className="admin-login-page__input">
                  <Mail size={18} aria-hidden />
                  <input
                    id="admin-email"
                    type="email"
                    autoComplete="username"
                    value={email}
                    onChange={(e) => setEmail(normalizeEmailInput(e.target.value))}
                    placeholder="admin@hospital.com"
                    autoCapitalize="none"
                    spellCheck={false}
                  />
                </div>
              </div>

              <div className="admin-login-page__field">
                <label htmlFor="admin-password">Password</label>
                <div className="admin-login-page__input">
                  <Lock size={18} aria-hidden />
                  <input
                    id="admin-password"
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                  />
                </div>
              </div>

              {displayError ? (
                <p className="admin-login-page__error" role="alert">
                  {displayError}
                </p>
              ) : null}

              <button
                type="submit"
                className="admin-login-page__submit"
                disabled={submitting}
              >
                {submitting ? 'Signing in…' : 'Sign in'}
                <ArrowRight size={18} aria-hidden />
              </button>
            </form>

            <p className="admin-login-page__hint">
              Admin demo? Use the{' '}
              <Link to={ROUTES.SUPER_ADMIN_LOGIN}>Admin portal</Link>
              {' '}— separate from this manager login.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}

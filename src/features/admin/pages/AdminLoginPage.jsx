import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Lock, Mail, ShieldCheck, UserCog } from 'lucide-react';
import { ROUTES, ROLES } from '@/shared/constants';
import { BrandLogo, BrandName } from '@/shared/components/common';
import { useAuthStore } from '@/shared/store/useAuthStore';
import { isStaffModuleLive } from '@/shared/constants/moduleAvailability';
import { trimCredentials, hasCredentials } from '@/shared/utils/credentials';
import { toast } from '@/shared/utils/toast';
import '@/features/admin/styles/admin-login.css';

export default function AdminLoginPage() {
  const { login, logout, error, isAuthenticated, user, authReady } = useAuthStore();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (!authReady || !isAuthenticated || !user) return;
    if (user.role === ROLES.ADMIN) {
      navigate(ROUTES.ADMIN_DASHBOARD, { replace: true });
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

      if (me.role !== ROLES.ADMIN) {
        logout();
        const blocked = 'This portal is for administrator accounts only.';
        setFormError(blocked);
        toast.error(blocked);
        return;
      }

      if (!isStaffModuleLive(me.department, me.role)) {
        logout();
        const blocked = `${me.department || 'Administration'} is not available yet.`;
        setFormError(blocked);
        toast.error(blocked);
        return;
      }

      toast.success(`Welcome, ${me.full_name}`);
      navigate(ROUTES.ADMIN_DASHBOARD, { replace: true });
    } catch (err) {
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
        <aside className="admin-login-page__hero" aria-label="SaffoCare admin portal">
          <Link to={ROUTES.HOME} className="admin-login-page__back">
            <ArrowLeft size={16} aria-hidden />
            Back
          </Link>

          <div className="admin-login-page__hero-body">
            <BrandLogo size={48} />
            <h1 className="admin-login-page__hero-title">
              <BrandName variant="on-dark" /> Admin
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
              <h2 id="admin-sign-in-title">Admin sign in</h2>
              <p>Use an account with the <strong>admin</strong> role from the hospital system.</p>
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
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@hospital.com"
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
              First time? Register an admin via POST /auth/register (role_id=1), then sign in here.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}

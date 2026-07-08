import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Lock, Mail, Shield, ShieldCheck } from 'lucide-react';
import { ROUTES } from '@/shared/constants';
import { BrandLogo, BrandName } from '@/shared/components/common';
import { useAuthStore } from '@/shared/store/useAuthStore';
import { trimCredentials, hasCredentials } from '@/shared/utils/credentials';
import { toast } from '@/shared/utils/toast';
import {
  DEMO_SUPER_ADMIN_CREDENTIALS,
  isDemoSuperAdminSession,
} from '@/features/super-admin/utils/superAdminPortal';
import '@/features/super-admin/styles/super-admin-login.css';

export default function SuperAdminLoginPage() {
  const { loginDemoSuperAdmin, error, isAuthenticated, user, authReady } = useAuthStore();
  const navigate = useNavigate();
  const [email, setEmail] = useState(DEMO_SUPER_ADMIN_CREDENTIALS.email);
  const [password, setPassword] = useState(DEMO_SUPER_ADMIN_CREDENTIALS.password);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (!authReady || !isAuthenticated || !user) return;

    if (isDemoSuperAdminSession(user)) {
      navigate(ROUTES.SUPER_ADMIN_DASHBOARD, { replace: true });
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
      const profile = await loginDemoSuperAdmin(trimmed);
      toast.success(`Welcome, ${profile.full_name}`);
      navigate(ROUTES.SUPER_ADMIN_DASHBOARD, { replace: true });
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
    <div className="admin-login-page super-admin-login-page">
      <div className="admin-login-page__frame">
        <aside className="admin-login-page__hero" aria-label="SaffoCare super admin portal">
          <Link to={ROUTES.HOME} className="admin-login-page__back">
            <ArrowLeft size={16} aria-hidden />
            Back
          </Link>

          <div className="admin-login-page__hero-body">
            <BrandLogo size={48} />
            <h1 className="admin-login-page__hero-title">
              <BrandName variant="on-dark" /> Super Admin
            </h1>
            <p className="admin-login-page__hero-lead">
              Owner console demo portal. Sign in with the hardcoded credentials below — no backend
              account required.
            </p>
          </div>

          <div className="admin-login-page__hero-foot">
            <span>
              <ShieldCheck size={14} aria-hidden />
              Frontend demo access
            </span>
            <span>
              <Shield size={14} aria-hidden />
              Role & permission preview
            </span>
          </div>
        </aside>

        <section className="admin-login-page__form-panel" aria-labelledby="super-admin-sign-in-title">
          <Link to={ROUTES.HOME} className="admin-login-page__back admin-login-page__back--mobile">
            <ArrowLeft size={16} aria-hidden />
            Back
          </Link>

          <div className="admin-login-page__form-panel-inner">
            <header className="admin-login-page__form-head">
              <h2 id="super-admin-sign-in-title">Super Admin sign in</h2>
              <p>Use the demo credentials shown below.</p>
            </header>

            <div
              className="admin-login-page__hint"
              style={{
                marginBottom: '1rem',
                padding: '0.75rem 1rem',
                background: 'var(--color-surface-muted, #f4f6f8)',
                borderRadius: '8px',
                color: 'inherit',
              }}
              role="note"
            >
              <strong>Demo login</strong>
              <br />
              Email: <code>{DEMO_SUPER_ADMIN_CREDENTIALS.email}</code>
              <br />
              Password: <code>{DEMO_SUPER_ADMIN_CREDENTIALS.password}</code>
            </div>

            <form className="admin-login-page__form" onSubmit={handleSubmit}>
              <div className="admin-login-page__field">
                <label htmlFor="super-admin-email">Work email</label>
                <div className="admin-login-page__input">
                  <Mail size={18} aria-hidden />
                  <input
                    id="super-admin-email"
                    type="email"
                    autoComplete="username"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="superadmin@saffocare.com"
                    required
                  />
                </div>
              </div>

              <div className="admin-login-page__field">
                <label htmlFor="super-admin-password">Password</label>
                <div className="admin-login-page__input">
                  <Lock size={18} aria-hidden />
                  <input
                    id="super-admin-password"
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
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
                {submitting ? 'Signing in…' : 'Sign in to Super Admin'}
                <ArrowRight size={18} aria-hidden />
              </button>
            </form>

            <p className="admin-login-page__hint">
              Other staff? <Link to={ROUTES.LOGIN}>Staff login →</Link>
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}

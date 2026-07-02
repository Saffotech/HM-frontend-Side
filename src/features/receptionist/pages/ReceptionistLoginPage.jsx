import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Lock, Mail, ShieldCheck, UserRound } from 'lucide-react';
import { ROUTES } from '@/shared/constants';
import { BrandLogo, BrandName } from '@/shared/components/common';
import { useAuthStore } from '@/shared/store/useAuthStore';
import { getAppEntryForRole } from '@/shared/utils/authRedirect';
import { trimCredentials, hasCredentials } from '@/shared/utils/credentials';
import { toast } from '@/shared/utils/toast';
import {
  DEMO_RECEPTIONIST_CREDENTIALS,
  isDemoReceptionistSession,
} from '@/features/receptionist/utils/receptionistPortal';
import '@/pages/landing/LoginPage.css';

export default function ReceptionistLoginPage() {
  const { loginDemoReceptionist, error, isAuthenticated, user, authReady } = useAuthStore();
  const navigate = useNavigate();
  const [email, setEmail] = useState(DEMO_RECEPTIONIST_CREDENTIALS.email);
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (!authReady || !isAuthenticated || !user) return;

    if (isDemoReceptionistSession(user)) {
      navigate(ROUTES.RECEPTIONIST_DASHBOARD, { replace: true });
      return;
    }

    navigate(getAppEntryForRole(user.role), { replace: true });
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
      const profile = await loginDemoReceptionist(trimmed);
      toast.success(`Welcome, ${profile.full_name}`);
      navigate(ROUTES.RECEPTIONIST_DASHBOARD, { replace: true });
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
    <div className="staff-login-page">
      <div className="staff-login-page__frame">
        <aside className="staff-login-page__hero" aria-label="SaffoCare reception portal">
          <Link to={ROUTES.HOME} className="staff-login-page__back">
            <ArrowLeft size={16} aria-hidden />
            Back
          </Link>

          <div className="staff-login-page__hero-body">
            <BrandLogo size={48} className="staff-login-page__hero-icon" />
            <h1 className="staff-login-page__hero-title">
              <BrandName variant="on-dark" /> reception
            </h1>
            <p className="staff-login-page__hero-lead">
              Front desk demo portal. Sign in with the hardcoded receptionist credentials below — no
              backend account or admin registration required.
            </p>
          </div>

          <div className="staff-login-page__hero-foot">
            <span>
              <ShieldCheck size={14} aria-hidden />
              Frontend demo access
            </span>
            <span>
              <UserRound size={14} aria-hidden />
              Reception portal
            </span>
          </div>
        </aside>

        <section className="staff-login-page__form-panel" aria-labelledby="receptionist-sign-in-title">
          <Link to={ROUTES.HOME} className="staff-login-page__back staff-login-page__back--mobile">
            <ArrowLeft size={16} aria-hidden />
            Back
          </Link>

          <div className="staff-login-page__form-panel-inner">
            <header className="staff-login-page__form-head">
              <h2 id="receptionist-sign-in-title">Reception sign in</h2>
              <p>Use the demo credentials shown below.</p>
            </header>

            <div
              className="staff-login-page__error"
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
              Email: <code>{DEMO_RECEPTIONIST_CREDENTIALS.email}</code>
              <br />
              Password: <code>{DEMO_RECEPTIONIST_CREDENTIALS.password}</code>
            </div>

            <form className="staff-login-page__form" onSubmit={handleSubmit}>
              <div className="staff-login-page__field">
                <label htmlFor="receptionist-email">Work Email</label>
                <div className="staff-login-page__input">
                  <Mail size={16} aria-hidden />
                  <input
                    id="receptionist-email"
                    type="email"
                    placeholder="receptionist@saffocare.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    required
                  />
                </div>
              </div>

              <div className="staff-login-page__field">
                <label htmlFor="receptionist-password">Password</label>
                <div className="staff-login-page__input">
                  <Lock size={16} aria-hidden />
                  <input
                    id="receptionist-password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    required
                  />
                </div>
              </div>

              {displayError && (
                <p className="staff-login-page__error" role="alert">
                  {displayError}
                </p>
              )}

              <button
                type="submit"
                className="staff-login-page__submit"
                disabled={submitting}
              >
                {submitting ? 'Signing in…' : 'Sign in to Reception'}
                <ArrowRight size={18} aria-hidden />
              </button>
            </form>

            <p className="staff-login-page__patient-link">
              Other staff? <Link to={ROUTES.LOGIN}>Staff login →</Link>
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}

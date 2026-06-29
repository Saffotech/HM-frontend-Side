import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Lock, Mail, Pill, ShieldCheck } from 'lucide-react';
import { ROUTES, ROLES } from '@/shared/constants';
import { BrandLogo, BrandName } from '@/shared/components/common';
import { useAuthStore } from '@/shared/store/useAuthStore';
import { getAppEntryForRole } from '@/shared/utils/authRedirect';
import { trimCredentials, hasCredentials } from '@/shared/utils/credentials';
import { toast } from '@/shared/utils/toast';
import { isStaffModuleLive } from '@/shared/constants/moduleAvailability';
import '@/pages/landing/LoginPage.css';

export default function PharmacyLoginPage() {
  const { login, logout, error, isAuthenticated, user, authReady } = useAuthStore();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (!authReady || !isAuthenticated || !user) return;
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
      const me = await login(trimmed);

      if (me.role !== ROLES.PHARMACIST) {
        logout();
        const blocked = 'This portal is for pharmacist accounts only.';
        setFormError(blocked);
        toast.error(blocked);
        return;
      }

      if (!isStaffModuleLive(me.department, me.role)) {
        logout();
        const blocked = `${me.department || 'Pharmacy'} is not available yet.`;
        setFormError(blocked);
        toast.error(blocked);
        return;
      }

      toast.success(`Welcome, ${me.full_name}`);
      navigate(ROUTES.PHARMACY_PRESCRIPTIONS, { replace: true });
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
        <aside className="staff-login-page__hero" aria-label="SaffoCare pharmacy portal">
          <Link to={ROUTES.HOME} className="staff-login-page__back">
            <ArrowLeft size={16} aria-hidden />
            Back
          </Link>

          <div className="staff-login-page__hero-body">
            <BrandLogo size={48} className="staff-login-page__hero-icon" />
            <h1 className="staff-login-page__hero-title">
              <BrandName variant="on-dark" /> pharmacy
            </h1>
            <p className="staff-login-page__hero-lead">
              Review prescriptions, check allergies, and dispense medicines safely.
            </p>

            <div className="staff-login-page__stats">
              <div className="staff-login-page__stat">
                <span className="staff-login-page__stat-value">Secure</span>
                <span className="staff-login-page__stat-label">Staff login</span>
              </div>
              <div className="staff-login-page__stat">
                <span className="staff-login-page__stat-value">Rx</span>
                <span className="staff-login-page__stat-label">Queue</span>
              </div>
            </div>
          </div>

          <div className="staff-login-page__hero-foot">
            <span>
              <ShieldCheck size={14} aria-hidden />
              Allergy alerts on every prescription
            </span>
            <span>
              <Pill size={14} aria-hidden />
              Dispense tracking built in
            </span>
          </div>
        </aside>

        <section className="staff-login-page__form-panel" aria-labelledby="pharmacy-sign-in-title">
          <Link to={ROUTES.HOME} className="staff-login-page__back staff-login-page__back--mobile">
            <ArrowLeft size={16} aria-hidden />
            Back
          </Link>

          <div className="staff-login-page__form-panel-inner">
            <header className="staff-login-page__form-head">
              <h2 id="pharmacy-sign-in-title">Pharmacy sign in</h2>
              <p>Sign in with your pharmacist account registered in the hospital system.</p>
            </header>

            <form className="staff-login-page__form" onSubmit={handleSubmit}>
              <div className="staff-login-page__field">
                <label htmlFor="pharmacy-email">Work Email</label>
                <div className="staff-login-page__input">
                  <Mail size={16} aria-hidden />
                  <input
                    id="pharmacy-email"
                    type="email"
                    placeholder="you@saffocare.local"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    required
                  />
                </div>
              </div>

              <div className="staff-login-page__field">
                <label htmlFor="pharmacy-password">Password</label>
                <div className="staff-login-page__input">
                  <Lock size={16} aria-hidden />
                  <input
                    id="pharmacy-password"
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
                {submitting ? 'Signing in…' : 'Sign in to Pharmacy'}
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

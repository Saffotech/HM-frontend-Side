import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Lock,
  Mail,
  ShieldCheck,
} from 'lucide-react';
import { ROUTES } from '@/shared/constants';
import { BrandLogo, BrandName } from '@/shared/components/common';
import { useAuthStore } from '@/shared/store/useAuthStore';
import { getAppEntryForRole } from '@/shared/utils/authRedirect';
import { trimCredentials, hasCredentials } from '@/shared/utils/credentials';
import { toast } from '@/shared/utils/toast';
import { isStaffModuleLive } from '@/shared/constants/moduleAvailability';
import './LoginPage.css';

const STATS = [
  { value: '12+', label: 'Departments' },
  { value: '99.9%', label: 'Uptime' },
  { value: '256-bit', label: 'Encryption' },
];

/** public/videos/Login_Animetion.mp4 — bump ?v= when replacing the file (cache bust) */
const STAFF_LOGIN_BG_VIDEO = '/videos/Login_Animetion.mp4?v=1';

export default function LoginPage() {
  const { login, logout, error, isAuthenticated, user, authReady } = useAuthStore();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [bgVideoOk, setBgVideoOk] = useState(true);
  const bgVideoRef = useRef(null);

  useEffect(() => {
    if (searchParams.get('switch') === '1') {
      logout();
      navigate(ROUTES.LOGIN, { replace: true });
    }
  }, [searchParams, logout, navigate]);

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
      if (!isStaffModuleLive(me.department, me.role)) {
        logout();
        const blocked = `${me.department || 'This module'} is not available yet.`;
        setFormError(blocked);
        toast.error(blocked);
        return;
      }
      toast.success(`Welcome, ${me.full_name}`);
      navigate(getAppEntryForRole(me.role), { replace: true });
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

  useEffect(() => {
    if (!submitting) return undefined;
    const safety = setTimeout(() => setSubmitting(false), 10000);
    return () => clearTimeout(safety);
  }, [submitting]);

  useEffect(() => {
    const video = bgVideoRef.current;
    if (!video) return undefined;

    const play = () => {
      video.play().catch(() => {});
    };

    video.load();
    if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      play();
    } else {
      video.addEventListener('loadeddata', play, { once: true });
    }

    return () => video.removeEventListener('loadeddata', play);
  }, []);

  const displayError = formError || error;

  return (
    <div className="staff-login-page">
      <div className="staff-login-page__bg" aria-hidden>
        {bgVideoOk ? (
          <video
            ref={bgVideoRef}
            className="staff-login-page__bg-video"
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            onError={() => setBgVideoOk(false)}
          >
            <source src={STAFF_LOGIN_BG_VIDEO} type="video/mp4" />
          </video>
        ) : null}
        <div className="staff-login-page__bg-overlay" />
      </div>
      <div className="staff-login-page__frame">
        <aside className="staff-login-page__hero" aria-label="SaffoCare staff portal">
          <Link to={ROUTES.HOME} className="staff-login-page__back">
            <ArrowLeft size={16} aria-hidden />
            Back
          </Link>

          <div className="staff-login-page__hero-body">
            <BrandLogo size={48} className="staff-login-page__hero-icon" />
            <h1 className="staff-login-page__hero-title">
              <BrandName variant="on-dark" /> staff portal
            </h1>
            <p className="staff-login-page__hero-lead">
              One secure portal for doctors, pharmacists, lab techs and admin.
            </p>

            <svg
              className="staff-login-page__ecg"
              viewBox="0 0 320 48"
              aria-hidden
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M0 24 H40 L52 8 L64 40 L76 16 L88 32 L100 24 H320"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>

            <div className="staff-login-page__stats">
              {STATS.map((item) => (
                <div key={item.label} className="staff-login-page__stat">
                  <span className="staff-login-page__stat-value">{item.value}</span>
                  <span className="staff-login-page__stat-label">{item.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="staff-login-page__hero-foot">
            <span>
              <ShieldCheck size={14} aria-hidden />
              HIPAA-ready infrastructure
            </span>
            <span>
              <Lock size={14} aria-hidden />
              End-to-end encrypted sessions
            </span>
          </div>
        </aside>

        <section className="staff-login-page__form-panel" aria-labelledby="staff-sign-in-title">
          <div className="staff-login-page__form-panel-bg" aria-hidden />
          <Link to={ROUTES.HOME} className="staff-login-page__back staff-login-page__back--mobile">
            <ArrowLeft size={16} aria-hidden />
            Back
          </Link>

          <div className="staff-login-page__form-panel-inner">
            <div className="staff-login-page__form-card">
              <header className="staff-login-page__form-head">
                <div className="staff-login-page__form-head-brand">
                  <BrandLogo size={44} className="staff-login-page__form-logo" />
                </div>
                <h2 id="staff-sign-in-title">Sign in</h2>
                <p>Welcome back. Enter your credentials to continue.</p>
              </header>

              {isAuthenticated && user && (
                <div className="staff-login-page__session" role="status">
                  <p>
                    Signed in as <strong>{user.full_name}</strong>
                  </p>
                  <div className="staff-login-page__session-actions">
                    <button
                      type="button"
                      className="staff-login-page__btn staff-login-page__btn--outline"
                      onClick={() =>
                        navigate(getAppEntryForRole(user.role), { replace: true })
                      }
                    >
                      Continue
                    </button>
                    <button
                      type="button"
                      className="staff-login-page__btn staff-login-page__btn--ghost"
                      onClick={() => navigate(`${ROUTES.LOGIN}?switch=1`, { replace: true })}
                    >
                      Switch user
                    </button>
                  </div>
                </div>
              )}

              <form className="staff-login-page__form" onSubmit={handleSubmit}>
                <div className="staff-login-page__field">
                  <label htmlFor="staff-email">Work Email</label>
                  <div className="staff-login-page__input">
                    <span className="staff-login-page__input-icon" aria-hidden>
                      <Mail size={17} />
                    </span>
                    <input
                      id="staff-email"
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
                  <div className="staff-login-page__label-row">
                    <label htmlFor="staff-password">Password</label>
                    <a href="#forgot" className="staff-login-page__forgot">
                      Forgot?
                    </a>
                  </div>
                  <div className="staff-login-page__input">
                    <span className="staff-login-page__input-icon" aria-hidden>
                      <Lock size={17} />
                    </span>
                    <input
                      id="staff-password"
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
                  <span>{submitting ? 'Signing in…' : 'Sign in'}</span>
                  {!submitting && <ArrowRight size={18} className="staff-login-page__submit-arrow" aria-hidden />}
                </button>
              </form>

              <footer className="staff-login-page__form-trust">
                <span>
                  <ShieldCheck size={14} aria-hidden />
                  Secure staff access
                </span>
                <span>
                  <Lock size={14} aria-hidden />
                  Encrypted connection
                </span>
              </footer>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

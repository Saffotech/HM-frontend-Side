import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  CalendarCheck,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  ShieldCheck,
} from 'lucide-react';
import { BrandLogo, BrandName } from '@/shared/components/common';
import { ROUTES } from '@/shared/constants';
import { useAuthStore } from '@/shared/store/useAuthStore';
import { isSupersededSessionError } from '@/components/security/httpSessionPolicy';
import { getAppEntryForUser } from '@/shared/utils/authRedirect';
import { useUniversalSignIn } from '@/shared/auth/useUniversalSignIn';
import { trimCredentials, hasCredentials, normalizeEmailInput } from '@/shared/utils/credentials';
import { toast } from '@/shared/utils/toast';
import './LoginPage.design.css';

const HERO_IMAGE = '/images/hospital-login.png';

const SLIDES = [
  {
    icon: Activity,
    title: 'Real-time patient monitoring',
    body: 'Vitals, lab results and care notes in one secure, unified record.',
  },
  {
    icon: CalendarCheck,
    title: 'Appointments without the wait',
    body: 'Book, reschedule and check in for visits from any device.',
  },
  {
    icon: ShieldCheck,
    title: 'Privacy you can trust',
    body: 'End-to-end encrypted and built to meet healthcare compliance standards.',
  },
];

const COPY = {
  signin: {
    title: 'Welcome back',
    subtitle: 'Sign in with your work email to open your SaffoCare portal.',
    cta: 'Sign in',
  },
  forgot: {
    title: 'Reset your password',
    subtitle: "Enter your email and we'll send a secure reset link.",
    cta: 'Send reset link',
  },
};

const MODE_ORDER = { signin: 0, forgot: 1, sent: 2 };

function isValidEmail(value) {
  return /^\S+@\S+\.\S+$/.test(value);
}

function LoginField({
  id,
  label,
  icon: Icon,
  error,
  type = 'text',
  value,
  onChange,
  ...inputProps
}) {
  const [visible, setVisible] = useState(false);
  const isPassword = type === 'password';

  return (
    <div className="hlogin-field">
      <label htmlFor={id}>{label}</label>
      <div className={`hlogin-input${isPassword ? ' hlogin-input--password' : ''}`}>
        <Icon size={16} aria-hidden />
        <input
          id={id}
          type={isPassword && visible ? 'text' : type}
          value={value}
          onChange={onChange}
          readOnly
          onFocus={(event) => {
            event.currentTarget.readOnly = false;
          }}
          autoComplete="off"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          {...inputProps}
        />
        {isPassword && (
          <button
            type="button"
            className="hlogin-eye"
            onClick={() => setVisible((current) => !current)}
            aria-label={visible ? 'Hide password' : 'Show password'}
          >
            {visible ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        )}
      </div>
      {error ? (
        <p id={`${id}-error`} className="hlogin-field-error">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export default function LoginPage() {
  const { error, isAuthenticated, user, authReady } = useAuthStore();
  const { signIn, signOutEverywhere } = useUniversalSignIn();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState('signin');
  const [direction, setDirection] = useState('forward');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [slideIndex, setSlideIndex] = useState(0);

  const slide = SLIDES[slideIndex];
  const SlideIcon = slide.icon;

  useEffect(() => {
    if (searchParams.get('switch') === '1') {
      signOutEverywhere();
      navigate(ROUTES.LOGIN, { replace: true });
    }
  }, [searchParams, signOutEverywhere, navigate]);

  useEffect(() => {
    if (!authReady || !isAuthenticated || !user) return;
    navigate(getAppEntryForUser(user), { replace: true });
  }, [authReady, isAuthenticated, user, navigate]);

  useEffect(() => {
    const id = setInterval(() => {
      setSlideIndex((current) => (current + 1) % SLIDES.length);
    }, 5000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!submitting) return undefined;
    const safety = setTimeout(() => setSubmitting(false), 10000);
    return () => clearTimeout(safety);
  }, [submitting]);

  function goTo(next) {
    setDirection(MODE_ORDER[next] >= MODE_ORDER[mode] ? 'forward' : 'back');
    setFieldErrors({});
    setFormError('');
    setMode(next);
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError('');

    const nextErrors = {};
    const trimmedEmail = normalizeEmailInput(email);
    if (!trimmedEmail) nextErrors.email = 'Email is required.';
    else if (!isValidEmail(trimmedEmail)) nextErrors.email = 'Enter a valid email address.';
    if (mode === 'signin' && !password) nextErrors.password = 'Password is required.';
    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    if (mode === 'forgot') {
      setSubmitting(true);
      window.setTimeout(() => {
        setSubmitting(false);
        goTo('sent');
      }, 800);
      return;
    }

    const trimmed = trimCredentials({ email: trimmedEmail, password });
    if (!hasCredentials(trimmed)) {
      setFormError('Please enter your email and password');
      return;
    }

    setSubmitting(true);
    try {
      const result = await signIn(trimmed);
      const name = result.profile?.full_name || result.profile?.name || 'back';
      toast.success(`Welcome, ${name}`);
      navigate(result.destination, { replace: true });
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
  const copy = mode === 'sent' ? null : COPY[mode];

  return (
    <main className="hlogin">
      <div className="hlogin-glow hlogin-glow--left" aria-hidden />
      <div className="hlogin-glow hlogin-glow--right" aria-hidden />

      <div className="hlogin-grid">
        <section className="hlogin-form-col">
          <Link to={ROUTES.HOME} className="hlogin-brand">
            <BrandLogo size={32} className="hlogin-brand-logo" />
            <BrandName className="hlogin-brand-name" />
          </Link>

          <div className="hlogin-form-wrap">
            <div
              key={mode}
              className={`hlogin-card hlogin-card--${direction}`}
            >
              {mode === 'sent' ? (
                <div className="hlogin-sent" role="status">
                  <div className="hlogin-sent-icon">
                    <span>
                      <CheckCircle2 size={40} aria-hidden />
                    </span>
                  </div>
                  <h1 className="hlogin-title">Check your inbox</h1>
                  <p className="hlogin-subtitle">
                    If an account exists for that email, a reset link is on its way.
                  </p>
                  <button type="button" className="hlogin-sent-back" onClick={() => goTo('signin')}>
                    <ArrowLeft size={16} aria-hidden />
                    Back to sign in
                  </button>
                </div>
              ) : (
                <>
                  {mode === 'forgot' && (
                    <button type="button" className="hlogin-back" onClick={() => goTo('signin')}>
                      <ArrowLeft size={16} aria-hidden />
                      Back to sign in
                    </button>
                  )}

                  <header>
                    {mode === 'signin' && (
                      <Link to={ROUTES.HOME} className="hlogin-home-back">
                        <ArrowLeft size={16} className="hlogin-home-back-arrow" aria-hidden />
                        Back
                      </Link>
                    )}
                    <h1 className="hlogin-title" id="staff-sign-in-title">
                      {copy.title}
                    </h1>
                    <p className="hlogin-subtitle">{copy.subtitle}</p>
                  </header>

                  {mode === 'signin' && isAuthenticated && user && (
                    <div className="hlogin-session" role="status">
                      <p>
                        Signed in as <strong>{user.full_name}</strong>
                      </p>
                      <div className="hlogin-session-actions">
                        <button
                          type="button"
                          className="hlogin-outline"
                          onClick={() => navigate(getAppEntryForUser(user), { replace: true })}
                        >
                          Continue
                        </button>
                        <button
                          type="button"
                          className="hlogin-ghost"
                          onClick={() => navigate(`${ROUTES.LOGIN}?switch=1`, { replace: true })}
                        >
                          Switch user
                        </button>
                      </div>
                    </div>
                  )}

                  <form className="hlogin-form" onSubmit={handleSubmit} autoComplete="off" noValidate>
                    <LoginField
                      id="staff-email"
                      label="Email address"
                      icon={Mail}
                      type="email"
                      placeholder="you@saffocare.com"
                      value={email}
                      onChange={(event) => setEmail(normalizeEmailInput(event.target.value))}
                      autoComplete="off"
                      autoCapitalize="none"
                      spellCheck={false}
                      error={fieldErrors.email}
                    />

                    {mode === 'signin' && (
                      <>
                        <LoginField
                          id="staff-password"
                          label="Password"
                          icon={Lock}
                          type="password"
                          placeholder="••••••••"
                          value={password}
                          onChange={(event) => setPassword(event.target.value)}
                          autoComplete="off"
                          error={fieldErrors.password}
                        />
                        <div className="hlogin-row">
                          <label className="hlogin-remember">
                            <input type="checkbox" name="remember" />
                            Remember me
                          </label>
                          <button type="button" className="hlogin-link" onClick={() => goTo('forgot')}>
                            Forgot password?
                          </button>
                        </div>
                      </>
                    )}

                    {displayError ? (
                      <p className="hlogin-error" role="alert">
                        {displayError}
                      </p>
                    ) : null}

                    <button type="submit" className="hlogin-submit" disabled={submitting}>
                      {submitting ? (
                        <>
                          <Loader2 size={16} className="hlogin-spin" aria-hidden />
                          Please wait…
                        </>
                      ) : (
                        <>
                          {copy.cta}
                          <ArrowRight size={16} className="hlogin-arrow" aria-hidden />
                        </>
                      )}
                    </button>
                  </form>

                  {mode === 'signin' && (
                    <p className="hlogin-trust">
                      <ShieldCheck size={16} aria-hidden />
                      Your health data is protected and never shared.
                    </p>
                  )}
                </>
              )}
            </div>
          </div>

          <footer className="hlogin-foot">
            <p>© 2026 Saffocare Hospital</p>
          </footer>
        </section>

        <aside className="hlogin-hero" aria-label="SaffoCare highlights">
          <img className="hlogin-hero-photo" src={HERO_IMAGE} alt="" />
          <div className="hlogin-hero-shade" aria-hidden />

          <div className="hlogin-hero-top">
            <div className="hlogin-live">
              <span className="hlogin-live-dot" aria-hidden>
                <span />
                <span />
              </span>
              Emergency line open 24/7
            </div>
          </div>

          <div className="hlogin-hero-body">
            <svg className="hlogin-ecg" viewBox="0 0 300 60" aria-hidden>
              <path
                d="M0 30 H90 L105 10 L120 50 L135 5 L150 55 L165 30 H300"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>

            <div key={slideIndex} className="hlogin-slide">
              <div className="hlogin-slide-icon">
                <SlideIcon size={20} aria-hidden />
              </div>
              <h2>{slide.title}</h2>
              <p className="hlogin-hero-copy">{slide.body}</p>
            </div>

            <div className="hlogin-dots" role="tablist" aria-label="Highlights">
              {SLIDES.map((item, index) => (
                <button
                  key={item.title}
                  type="button"
                  role="tab"
                  aria-selected={index === slideIndex}
                  aria-label={item.title}
                  className={`hlogin-dot${index < slideIndex ? ' is-done' : ''}`}
                  onClick={() => setSlideIndex(index)}
                >
                  {index === slideIndex ? <span className="hlogin-dot-fill" /> : null}
                </button>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}

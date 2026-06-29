import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useFormValidation } from '@/shared/hooks/useFormValidation';
import { trimForm } from '@/shared/utils/trimForm';

import {

  ArrowLeft,

  Eye,

  EyeOff,

  Lock,

  Mail,

  Phone,

  ShieldCheck,

  Star,

  UserRound,

} from 'lucide-react';

import { ROUTES } from '@/shared/constants';
import { BrandLogo, BrandName } from '@/shared/components/common';

import { toast } from '@/shared/utils/toast';

import './PatientLoginPage.css';



const FEATURE_TAGS = [

  'Instant Booking',

  'Lab Reports',

  'Rx Downloads',

  'Bill Payments',

  'Telemedicine',

];



export default function PatientLoginPage() {

  const navigate = useNavigate();

  const [mode, setMode] = useState('signin');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const { values, errors, handleChange, handleSubmit } = useFormValidation(
    { name: '', identifier: '', password: '' },
    (vals) => {
      const next = {};
      if (mode === 'signup' && !vals.name?.trim()) next.name = 'Name is required';
      if (!vals.identifier?.trim()) next.identifier = 'Email or phone is required';
      else if (!vals.identifier.includes('@')) {
        const phone = vals.identifier.replace(/\s/g, '');
        if (!/^\d{10}$/.test(phone)) next.identifier = 'Phone must be 10 digits';
      }
      if (!vals.password?.trim()) next.password = 'Password is required';
      return next;
    }
  );

  const onSubmit = handleSubmit(() => {
    setSubmitting(true);
    trimForm(values);
    toast.success(mode === 'signin' ? 'Welcome back!' : 'Account created. Welcome!');
    setTimeout(() => {
      setSubmitting(false);
      navigate(ROUTES.HOME);
    }, 800);
  });



  return (

    <div className="patient-login-page">

      <div className="patient-login-page__split">

        <div className="patient-login-page__bg" aria-hidden />

        {/* Left — branding */}

        <aside className="patient-login-page__hero" aria-label="About Patient Portal">

          <div className="patient-login-page__hero-inner">

            <div className="patient-login-page__hero-brand">
              <BrandLogo size={36} className="patient-login-page__hero-logo" />
              <span className="patient-login-page__hero-name">
                <BrandName variant="on-dark" /> Patient Portal
              </span>
            </div>



            <div className="patient-login-page__stats">

              <div className="patient-login-page__stat">

                <strong>2.4M+</strong>

                <span>Active Patients</span>

              </div>

              <div className="patient-login-page__stat">

                <strong>98%</strong>

                <span>Satisfaction Rate</span>

              </div>

            </div>



            <span className="patient-login-page__badge">

              <ShieldCheck size={14} aria-hidden />

              Secure &amp; HIPAA Compliant

            </span>



            <h1 className="patient-login-page__hero-title">

              Your health, <span className="patient-login-page__hero-accent">completely</span> in your

              hands.

            </h1>

            <p className="patient-login-page__hero-lead">

              Book appointments, access lab results, manage prescriptions, and pay bills — all from one

              secure place, on any device.

            </p>



            <div className="patient-login-page__tags">

              {FEATURE_TAGS.map((tag) => (

                <span key={tag} className="patient-login-page__tag">

                  {tag}

                </span>

              ))}

            </div>



            <blockquote className="patient-login-page__quote">

              <p>

                &ldquo;Everything I need is in one app. My prescriptions, test results, and upcoming

                appointments — I don&apos;t have to call the clinic anymore.&rdquo;

              </p>

              <footer>

                <span className="patient-login-page__quote-avatar" aria-hidden>

                  SM

                </span>

                <span className="patient-login-page__quote-meta">

                  <strong>Sarah M.</strong>

                  <span>Patient since 2021</span>

                  <span className="patient-login-page__stars" aria-label="5 out of 5 stars">

                    {Array.from({ length: 5 }).map((_, i) => (

                      <Star key={i} size={12} fill="currentColor" aria-hidden />

                    ))}

                  </span>

                </span>

              </footer>

            </blockquote>

          </div>

        </aside>



        {/* Right — login panel */}

        <main className="patient-login-page__panel">

          <div className="patient-login-page__panel-inner">

            <Link to={ROUTES.HOME} className="patient-login-page__back">

              <ArrowLeft size={16} aria-hidden />

              Back to home

            </Link>



            <header className="patient-login-page__panel-head">

              <h2>{mode === 'signin' ? 'Welcome back' : 'Create your account'}</h2>

              <p>

                {mode === 'signin'

                  ? 'Sign in to access your health records and appointments.'

                  : 'Register to book visits and manage your health online.'}

              </p>

            </header>



            <div className="patient-login-page__tabs" role="tablist">

              <button

                type="button"

                role="tab"

                aria-selected={mode === 'signin'}

                className={mode === 'signin' ? 'patient-login-page__tab--active' : ''}

                onClick={() => setMode('signin')}

              >

                Sign In

              </button>

              <button

                type="button"

                role="tab"

                aria-selected={mode === 'signup'}

                className={mode === 'signup' ? 'patient-login-page__tab--active' : ''}

                onClick={() => setMode('signup')}

              >

                Register

              </button>

            </div>



            <form className="patient-login-page__form" onSubmit={onSubmit}>

              {mode === 'signup' && (
                <>
                  <div className="patient-login-page__field">
                    <label htmlFor="patient-name">Full Name</label>
                    <div className="patient-login-page__input-wrap">
                      <span className="patient-login-page__input-icon" aria-hidden>
                        <UserRound size={18} />
                      </span>
                      <input
                        id="patient-name"
                        placeholder="Demo Patient"
                        value={values.name}
                        onChange={(e) => handleChange('name', e.target.value)}
                        autoComplete="name"
                      />
                    </div>
                    {errors.name && <p className="field__error">{errors.name}</p>}
                  </div>
                </>
              )}

              <div className="patient-login-page__field">

                <label htmlFor="patient-identifier">Email or Phone</label>

                <div className="patient-login-page__input-wrap">

                  <span className="patient-login-page__input-icon" aria-hidden>

                    {values.identifier.includes('@') ? <Mail size={18} /> : <Phone size={18} />}

                  </span>

                  <input

                    id="patient-identifier"

                    placeholder="you@email.com or +91 98765…"

                    value={values.identifier}

                    onChange={(e) => handleChange('identifier', e.target.value)}

                    autoComplete="username"

                  />

                </div>
                {errors.identifier && <p className="field__error">{errors.identifier}</p>}
              </div>

              <div className="patient-login-page__field">

                <div className="patient-login-page__label-row">

                  <label htmlFor="patient-password">Password</label>

                  {mode === 'signin' && (

                    <a href="#forgot" className="patient-login-page__forgot">

                      Forgot password?

                    </a>

                  )}

                </div>

                <div className="patient-login-page__input-wrap">

                  <span className="patient-login-page__input-icon" aria-hidden>

                    <Lock size={18} />

                  </span>

                  <input

                    id="patient-password"

                    type={showPassword ? 'text' : 'password'}

                    placeholder="••••••••"

                    value={values.password}

                    onChange={(e) => handleChange('password', e.target.value)}

                    autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}

                  />

                  <button

                    type="button"

                    className="patient-login-page__toggle-pw"

                    onClick={() => setShowPassword((v) => !v)}

                    aria-label={showPassword ? 'Hide password' : 'Show password'}

                  >

                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}

                  </button>

                </div>
                {errors.password && <p className="field__error">{errors.password}</p>}
              </div>

              {mode === 'signin' && (

                <label className="patient-login-page__remember">

                  <input

                    type="checkbox"

                    checked={remember}

                    onChange={(e) => setRemember(e.target.checked)}

                  />

                  <span className="patient-login-page__remember-box" aria-hidden />

                  Keep me signed in

                </label>

              )}



              <button type="submit" className="patient-login-page__submit" disabled={submitting}>

                {submitting ? 'Saving...' : mode === 'signin' ? 'Sign In' : 'Create Account'}

              </button>

            </form>



            <div className="patient-login-page__divider">

              <span>or continue with</span>

            </div>



            <button type="button" className="patient-login-page__google" onClick={() => toast.info('Google sign-in coming soon')}>

              <span className="patient-login-page__google-icon" aria-hidden>

                G

              </span>

              Continue with Google

            </button>



            <p className="patient-login-page__staff">

              Hospital staff?{' '}

              <Link to={`${ROUTES.LOGIN}?switch=1`}>Use the staff portal</Link>

            </p>



            <footer className="patient-login-page__compliance">

              <span><ShieldCheck size={12} aria-hidden /> HIPAA</span>

              <span>SOC 2</span>

              <span>256-bit SSL</span>

            </footer>

          </div>

        </main>

      </div>

    </div>

  );

}



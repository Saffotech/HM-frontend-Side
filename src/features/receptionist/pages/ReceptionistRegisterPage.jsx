import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Lock, Mail, UserRound } from 'lucide-react';
import { ROUTES } from '@/shared/constants';
import { BrandLogo, BrandName } from '@/shared/components/common';
import { register as authRegister } from '@/shared/api/auth';
import { toast } from '@/shared/utils/toast';
import '@/pages/landing/LoginPage.css';

const EMPTY_FORM = {
  first_name: '',
  last_name: '',
  email: '',
  password: '',
  role_id: '',
};

/**
 * Receptionist registration calls POST /auth/register.
 * Backend requires an authenticated admin with users:create.
 * Show backend validation errors; on success redirect to receptionist login.
 */
export default function ReceptionistRegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!form.first_name.trim() || !form.email.trim() || !form.password || !form.role_id) {
      setFormError('Please fill all required fields (first name, email, password, role id).');
      return;
    }

    if (form.password.length < 8) {
      setFormError('Password must be at least 8 characters');
      return;
    }

    const payload = {
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim() || null,
      email: form.email.trim(),
      password: form.password,
      role_id: Number(form.role_id),
      department_id: null,
    };

    setSubmitting(true);
    try {
      const result = await authRegister(payload);
      toast.success(result?.message || 'Account registered successfully');
      navigate(ROUTES.RECEPTIONIST_LOGIN, { replace: true });
    } catch (err) {
      const message =
        err?.status === 401 || err?.status === 403
          ? err?.message ||
            'Registration requires an authenticated admin with users:create permission.'
          : err?.status === 409
            ? 'Email already registered'
            : err?.message || 'Unable to register. Please try again.';
      setFormError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="staff-login-page">
      <div className="staff-login-page__frame">
        <aside className="staff-login-page__hero" aria-label="SaffoCare reception registration">
          <Link to={ROUTES.RECEPTIONIST_LOGIN} className="staff-login-page__back">
            <ArrowLeft size={16} aria-hidden />
            Back to login
          </Link>

          <div className="staff-login-page__hero-body">
            <BrandLogo size={48} className="staff-login-page__hero-icon" />
            <h1 className="staff-login-page__hero-title">
              <BrandName variant="on-dark" /> reception
            </h1>
            <p className="staff-login-page__hero-lead">
              Create a receptionist account via the hospital registration API.
            </p>
          </div>
        </aside>

        <section
          className="staff-login-page__form-panel"
          aria-labelledby="receptionist-register-title"
        >
          <div className="staff-login-page__form-panel-inner">
            <header className="staff-login-page__form-head">
              <h2 id="receptionist-register-title">Register receptionist</h2>
              <p>
                Uses POST /auth/register. An admin session with users:create is required by the
                backend.
              </p>
            </header>

            <form className="staff-login-page__form" onSubmit={handleSubmit}>
              <div className="staff-login-page__field">
                <label htmlFor="rec-reg-first">First name</label>
                <div className="staff-login-page__input">
                  <UserRound size={16} aria-hidden />
                  <input
                    id="rec-reg-first"
                    type="text"
                    value={form.first_name}
                    onChange={handleChange('first_name')}
                    required
                  />
                </div>
              </div>

              <div className="staff-login-page__field">
                <label htmlFor="rec-reg-last">Last name</label>
                <div className="staff-login-page__input">
                  <UserRound size={16} aria-hidden />
                  <input
                    id="rec-reg-last"
                    type="text"
                    value={form.last_name}
                    onChange={handleChange('last_name')}
                  />
                </div>
              </div>

              <div className="staff-login-page__field">
                <label htmlFor="rec-reg-email">Work Email</label>
                <div className="staff-login-page__input">
                  <Mail size={16} aria-hidden />
                  <input
                    id="rec-reg-email"
                    type="email"
                    value={form.email}
                    onChange={handleChange('email')}
                    autoComplete="email"
                    required
                  />
                </div>
              </div>

              <div className="staff-login-page__field">
                <label htmlFor="rec-reg-password">Password</label>
                <div className="staff-login-page__input">
                  <Lock size={16} aria-hidden />
                  <input
                    id="rec-reg-password"
                    type="password"
                    value={form.password}
                    onChange={handleChange('password')}
                    autoComplete="new-password"
                    required
                    minLength={8}
                  />
                </div>
              </div>

              <div className="staff-login-page__field">
                <label htmlFor="rec-reg-role">Receptionist role ID</label>
                <div className="staff-login-page__input">
                  <input
                    id="rec-reg-role"
                    type="number"
                    min={1}
                    placeholder="Role id for receptionist"
                    value={form.role_id}
                    onChange={handleChange('role_id')}
                    required
                  />
                </div>
              </div>

              {formError && (
                <p className="staff-login-page__error" role="alert">
                  {formError}
                </p>
              )}

              <button
                type="submit"
                className="staff-login-page__submit"
                disabled={submitting}
              >
                {submitting ? 'Registering…' : 'Register'}
                <ArrowRight size={18} aria-hidden />
              </button>
            </form>

            <p className="staff-login-page__patient-link">
              Already registered? <Link to={ROUTES.RECEPTIONIST_LOGIN}>Sign in →</Link>
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}

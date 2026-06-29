import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/shared/store/useAuthStore';
import { getAppEntryForRole } from '@/shared/utils/authRedirect';
import { useFormValidation } from '@/shared/hooks/useFormValidation';
import { trimForm } from '@/shared/utils/trimForm';
import Button from '@/shared/components/common/Button';
import Input from '@/shared/components/common/Input';

function validateLogin(values) {
  const errors = {};
  if (!values.email?.trim()) errors.email = 'Email is required';
  if (!values.password?.trim()) errors.password = 'Password is required';
  return errors;
}

export default function LoginForm() {
  const { login, loading, error } = useAuthStore();
  const navigate = useNavigate();
  const { values, errors, handleChange, handleSubmit } = useFormValidation(
    { email: '', password: '' },
    validateLogin
  );
  const [formError, setFormError] = useState('');

  const onSubmit = handleSubmit(async (raw) => {
    const trimmed = trimForm(raw);
    setFormError('');
    try {
      const me = await login({ email: trimmed.email, password: trimmed.password });
      navigate(getAppEntryForRole(me.role));
    } catch {
      setFormError('Invalid email or password');
    }
  });

  return (
    <form className="login-form" onSubmit={onSubmit}>
      <h1>Sign in</h1>
      <Input
        id="email"
        label="Email"
        type="email"
        value={values.email}
        onChange={(e) => handleChange('email', e.target.value)}
        error={errors.email}
      />
      <Input
        id="password"
        label="Password"
        type="password"
        value={values.password}
        onChange={(e) => handleChange('password', e.target.value)}
        error={errors.password}
      />
      {(formError || error) && (
        <p className="login-form__error">{formError || error}</p>
      )}
      <Button type="submit" disabled={loading}>
        {loading ? 'Signing in…' : 'Sign in'}
      </Button>
    </form>
  );
}

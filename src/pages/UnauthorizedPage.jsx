import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ShieldAlert } from 'lucide-react';
import { Button } from '@/shared/components/common';
import { ROUTES } from '@/shared/constants';
import { useAuth } from '@/shared/hooks/useAuth';
import { getAppEntryForRole } from '@/shared/utils/authRedirect';
import './UnauthorizedPage.css';

export default function UnauthorizedPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const home = user?.role ? getAppEntryForRole(user.role) : ROUTES.LOGIN;

  return (
    <div className="unauthorized-page">
      <div className="unauthorized-page__icon-wrap" aria-hidden>
        <ShieldAlert size={40} className="unauthorized-page__icon" />
      </div>
      <h1 className="unauthorized-page__title">Access denied</h1>
      <p className="unauthorized-page__message">
        Your account does not have permission to open this section.
        Contact your administrator if you believe this is an error.
      </p>
      <div className="unauthorized-page__actions">
        <Button onClick={() => navigate(home)}>Go to my dashboard</Button>
        <Button variant="outline" onClick={() => navigate(-1)}>
          <ArrowLeft size={16} />
          Go back
        </Button>
      </div>
    </div>
  );
}

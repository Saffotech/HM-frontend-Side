import { Link } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/shared/components/common';
import { ROUTES } from '@/shared/constants';
import './NotFoundPage.css';

export default function NotFoundPage() {
  return (
    <div className="not-found">
      <div className="not-found__card card">
        <AlertCircle size={40} className="not-found__icon" />
        <h1>404 Page Not Found</h1>
        <p>The page you are looking for does not exist.</p>
        <Link to={ROUTES.DASHBOARD}><Button>Go to Dashboard</Button></Link>
      </div>
    </div>
  );
}

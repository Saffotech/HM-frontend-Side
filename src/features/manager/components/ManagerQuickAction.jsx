import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

export default function AdminQuickAction({ to, icon, title, description, tone = 'neutral' }) {
  return (
    <Link to={to} className={`admin-quick-action admin-quick-action--${tone}`}>
      <div className="admin-quick-action__icon" aria-hidden>
        {icon}
      </div>
      <div className="admin-quick-action__text">
        <span className="admin-quick-action__title">{title}</span>
        {description ? (
          <span className="admin-quick-action__desc">{description}</span>
        ) : null}
      </div>
      <ChevronRight size={16} className="admin-quick-action__arrow" aria-hidden />
    </Link>
  );
}

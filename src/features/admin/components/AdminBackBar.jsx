import { ArrowLeft } from 'lucide-react';
import { Button } from '@/shared/components/common';

export default function AdminBackBar({ onBack, label = 'Back', children }) {
  return (
    <div className="admin-back-row">
      <Button variant="ghost" className="admin-back-btn" onClick={onBack}>
        <ArrowLeft size={16} aria-hidden />
        {label}
      </Button>
      {children ? <div className="admin-back-row__actions">{children}</div> : null}
    </div>
  );
}

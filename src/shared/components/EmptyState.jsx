import { Button } from '@/shared/components/common';
import './EmptyState.css';

export default function EmptyState({ icon: Icon, title, description, action, onAction }) {
  return (
    <div className="empty-state-block">
      {Icon && (
        <div className="empty-state-block__icon" aria-hidden>
          <Icon size={40} strokeWidth={1.5} />
        </div>
      )}
      <h3 className="empty-state-block__title">{title}</h3>
      {description && <p className="empty-state-block__description">{description}</p>}
      {action && onAction && (
        <Button type="button" onClick={onAction} className="empty-state-block__action">
          {action}
        </Button>
      )}
    </div>
  );
}

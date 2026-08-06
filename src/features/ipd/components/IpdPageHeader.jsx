import { cn } from '@/features/ipd/utils/cn';

export default function IpdPageHeader({ title, subtitle, actions, className }) {
  return (
    <div className={cn('ipd-page__header', className)}>
      <div>
        <h1 className="ipd-page__title">{title}</h1>
        {subtitle ? <p className="ipd-page__subtitle">{subtitle}</p> : null}
      </div>
      {actions ? <div className="ipd-form-actions">{actions}</div> : null}
    </div>
  );
}

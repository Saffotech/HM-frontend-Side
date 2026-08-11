import { cn } from '@/features/ipd/utils/cn';

export default function IpdPageHeader({ title, subtitle, middle, actions, className }) {
  return (
    <div
      className={cn(
        'ipd-page__header',
        middle && 'ipd-page__header--with-middle',
        className,
      )}
    >
      <div className="ipd-page__header-start">
        <h1 className="ipd-page__title">{title}</h1>
        {subtitle ? <p className="ipd-page__subtitle">{subtitle}</p> : null}
      </div>
      {middle ? <div className="ipd-page__header-middle">{middle}</div> : null}
      {actions ? <div className="ipd-form-actions">{actions}</div> : null}
    </div>
  );
}

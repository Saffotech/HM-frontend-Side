import './Card.css';

export default function Card({
  children,
  className = '',
  padding = true,
  hover = false,
  as: Tag = 'div',
  ...rest
}) {
  return (
    <Tag
      className={[
        'ui-card',
        padding ? 'ui-card--padded' : '',
        hover ? 'ui-card--hover' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      {children}
    </Tag>
  );
}

export function CardHeader({ title, action, children, className = '' }) {
  return (
    <div className={`ui-card__header ${className}`.trim()}>
      <div className="ui-card__header-text">
        {title ? <h3 className="ui-card__title">{title}</h3> : null}
        {children}
      </div>
      {action ? <div className="ui-card__header-action">{action}</div> : null}
    </div>
  );
}

export function CardBody({ children, className = '' }) {
  return <div className={`ui-card__body ${className}`.trim()}>{children}</div>;
}

import { Button } from '@/shared/components/common';

const DEFAULT_DISABLED_HINT = 'Delete disabled by Administrator.';

/**
 * Always renders a Delete button. When disabled by Admin settings,
 * keeps it visible with a native tooltip explaining why.
 */
export default function AdminGatedDeleteButton({
  disabledByAdmin = false,
  disabled = false,
  disabledHint = DEFAULT_DISABLED_HINT,
  onClick,
  children = 'Delete',
  variant = 'danger',
  size = 'sm',
  className = '',
  ...rest
}) {
  const isDisabled = Boolean(disabledByAdmin || disabled);
  const title = isDisabled ? (disabledHint || rest.title) : rest.title;

  return (
    <span
      className="admin-gated-delete"
      title={title}
      style={{ display: 'inline-block' }}
    >
      <Button
        variant={variant}
        size={size}
        className={className}
        disabled={isDisabled}
        onClick={isDisabled ? undefined : onClick}
        {...rest}
      >
        {children}
      </Button>
    </span>
  );
}

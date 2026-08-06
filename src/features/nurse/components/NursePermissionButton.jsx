import { toast } from '@/shared/utils/toast';

/**
 * Permission-aware nurse action button.
 * Off = gray (#E5E7EB / #9CA3AF) + toast on click.
 * On = normal click.
 */
export default function NursePermissionButton({
  allowed = true,
  deniedMessage = 'You do not have permission',
  className = '',
  onClick,
  type = 'button',
  style,
  children,
  ...rest
}) {
  const denied = !allowed;

  // Drop primary/secondary so theme-bridge green !important cannot win.
  const resolvedClass = denied
    ? `${className
        .replace(/\bnurse-btn--primary\b/g, '')
        .replace(/\bnurse-btn--secondary\b/g, '')
        .replace(/\s+/g, ' ')
        .trim()} nurse-btn--denied nurse-btn--no-permission`
    : className;

  return (
    <button
      type={type}
      {...rest}
      className={resolvedClass}
      aria-disabled={denied || undefined}
      style={
        denied
          ? {
              ...style,
              background: '#E5E7EB',
              color: '#9CA3AF',
              borderColor: '#E5E7EB',
              cursor: 'not-allowed',
              boxShadow: 'none',
            }
          : style
      }
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (denied) {
          toast.error(deniedMessage);
          return;
        }
        onClick?.(e);
      }}
    >
      {children}
    </button>
  );
}

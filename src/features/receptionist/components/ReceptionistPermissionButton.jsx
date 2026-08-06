import { toast } from '@/shared/utils/toast';

/**
 * Permission-aware receptionist action control.
 * Denied = gray + toast; allowed = normal click.
 */
export default function ReceptionistPermissionButton({
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

  return (
    <button
      type={type}
      {...rest}
      className={className}
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
      onClick={(e) => {
        if (denied) {
          e.preventDefault();
          e.stopPropagation();
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

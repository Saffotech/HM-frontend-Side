import { Loader2 } from 'lucide-react';
import '@/shared/components/common/Button.css';
import './button-extras.css';

/**
 * Unified Button — use across all HMS modules.
 * Variants: primary | secondary | outline | ghost | danger | success | warning | icon
 * Sizes: sm | md | lg
 */
export default function Button({
  children,
  type = 'button',
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  onClick,
  className = '',
  leftIcon: LeftIcon,
  rightIcon: RightIcon,
  iconOnly = false,
  'aria-label': ariaLabel,
  ...rest
}) {
  const resolvedVariant = variant === 'icon' || iconOnly ? 'ghost' : variant;
  const isDisabled = disabled || loading;

  return (
    <button
      type={type}
      disabled={isDisabled}
      onClick={onClick}
      aria-label={ariaLabel}
      aria-busy={loading || undefined}
      className={[
        'btn',
        `btn--${resolvedVariant}`,
        `btn--${size}`,
        iconOnly || variant === 'icon' ? 'btn--icon' : '',
        loading ? 'btn--loading' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      {loading ? (
        <Loader2 size={16} className="btn__spinner" aria-hidden />
      ) : (
        LeftIcon && <LeftIcon size={16} className="btn__icon" aria-hidden />
      )}
      {!iconOnly && variant !== 'icon' && children}
      {!loading && RightIcon && (
        <RightIcon size={16} className="btn__icon" aria-hidden />
      )}
    </button>
  );
}

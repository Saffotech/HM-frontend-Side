import { APP_LOGO_ALT, APP_LOGO_SRC } from '@/shared/constants';
import './BrandLogo.css';

export default function BrandLogo({ size = 32, className = '' }) {
  return (
    <img
      src={APP_LOGO_SRC}
      alt={APP_LOGO_ALT}
      className={`brand-logo ${className}`.trim()}
      width={size}
      height={size}
      decoding="async"
    />
  );
}

import { BRAND_NAME_LEAD, BRAND_NAME_TRAIL } from '@/shared/constants';
import './BrandName.css';

export default function BrandName({ className = '', variant = 'default', as: Tag = 'span', ...props }) {
  const variantClass = variant === 'on-dark' ? 'brand-name--on-dark' : '';
  return (
    <Tag className={`brand-name ${variantClass} ${className}`.trim()} {...props}>
      <span className="brand-name__lead">{BRAND_NAME_LEAD}</span>
      <span className="brand-name__trail">{BRAND_NAME_TRAIL}</span>
    </Tag>
  );
}

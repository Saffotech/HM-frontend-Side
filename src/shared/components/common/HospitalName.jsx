import { hospitalDisplayName } from '@/components/security/hospitalIdentity';
import { useAuth } from '@/shared/hooks/useAuth';
import './HospitalName.css';

/** Hospital label beside the SaffoCare wordmark. Reads the live profile only. */
export default function HospitalName({ className = '' }) {
  const { user } = useAuth();
  const name = hospitalDisplayName(user);
  if (!name) return null;

  return (
    <span className={`shell-hospital-name ${className}`.trim()} title={name}>
      {name}
    </span>
  );
}

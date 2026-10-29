import { Navigate, useLocation } from 'react-router-dom';

/** Old hospital owner URLs now live under /admin. */
export default function LegacyOwnerRedirect() {
  const { pathname, search, hash } = useLocation();
  const rest = pathname.replace(/^\/super-admin(?=\/|$)/, '') || '/dashboard';
  return <Navigate to={`/admin${rest}${search}${hash}`} replace />;
}

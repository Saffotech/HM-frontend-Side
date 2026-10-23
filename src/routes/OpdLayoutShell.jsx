import { Outlet } from 'react-router-dom';
import Layout from '@/shared/components/common/Layout';

export default function OpdLayoutShell() {
  return (
    <Layout>
      <Outlet />
    </Layout>
  );
}

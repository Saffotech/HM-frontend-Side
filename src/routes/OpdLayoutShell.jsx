import { Outlet } from 'react-router-dom';
import { Layout } from '@/shared/components/common';

export default function OpdLayoutShell() {
  return (
    <Layout>
      <Outlet />
    </Layout>
  );
}

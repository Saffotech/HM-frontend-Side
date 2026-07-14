import { Outlet } from 'react-router-dom';
import ReceptionistLayout from './ReceptionistLayout';

export default function ReceptionistAppShell() {
  return (
    <ReceptionistLayout>
      <Outlet />
    </ReceptionistLayout>
  );
}

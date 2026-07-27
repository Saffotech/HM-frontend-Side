import { Outlet } from 'react-router-dom';
import { NursePatientScopeProvider } from '@/features/nurse/context/NursePatientScopeContext';

export default function NurseAppShell() {
  return (
    <NursePatientScopeProvider>
      <Outlet />
    </NursePatientScopeProvider>
  );
}

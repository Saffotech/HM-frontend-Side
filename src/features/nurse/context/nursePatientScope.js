import { createContext, useContext } from 'react';

export const NursePatientScopeContext = createContext(null);

export function formatNurseShiftLabel(shiftName) {
  if (!shiftName) return 'Current Shift';
  const name = String(shiftName).trim();
  if (!name) return 'Current Shift';
  return name.toLowerCase().includes('shift') ? name : `${name} Shift`;
}

export function useNursePatientScope() {
  const ctx = useContext(NursePatientScopeContext);
  if (!ctx) {
    throw new Error('useNursePatientScope must be used within NursePatientScopeProvider');
  }
  return ctx;
}

/** Safe variant for optional usage outside provider (returns all-patients defaults). */
export function useNursePatientScopeOptional() {
  return useContext(NursePatientScopeContext);
}

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  useNurseBedAllocationSummaryQuery,
  useNurseBedPatientsQuery,
} from '@/shared/hooks/queries/useNurseQuery';

const STORAGE_KEY = 'nurse-patient-list-mode';

const NursePatientScopeContext = createContext(null);

function readStoredListMode() {
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored === 'allocated' || stored === 'all') return stored;
  } catch {
    /* ignore */
  }
  return null;
}

function writeStoredListMode(mode) {
  try {
    sessionStorage.setItem(STORAGE_KEY, mode);
  } catch {
    /* ignore */
  }
}

export function formatNurseShiftLabel(shiftName) {
  if (!shiftName) return 'Current Shift';
  const name = String(shiftName).trim();
  if (!name) return 'Current Shift';
  return name.toLowerCase().includes('shift') ? name : `${name} Shift`;
}

export function NursePatientScopeProvider({ children }) {
  const stored = readStoredListMode();
  // Never leave mode null — disabled All/Allocated buttons were breaking after navigation.
  const [listMode, setListModeState] = useState(() => stored ?? 'all');
  const userChosenRef = useRef(Boolean(stored));
  const autoDefaultAppliedRef = useRef(Boolean(stored));

  const {
    data: allocationSummary,
    isLoading: summaryLoading,
    isError: summaryError,
  } = useNurseBedAllocationSummaryQuery();

  useEffect(() => {
    if (userChosenRef.current || autoDefaultAppliedRef.current) return;
    if (summaryLoading) return;

    let next = 'all';
    if (!summaryError && allocationSummary?.has_allocations) {
      next = 'allocated';
    }

    setListModeState(next);
    writeStoredListMode(next);
    autoDefaultAppliedRef.current = true;
  }, [allocationSummary, summaryLoading, summaryError]);

  const setListMode = useCallback((mode) => {
    if (mode !== 'allocated' && mode !== 'all') return;
    userChosenRef.current = true;
    autoDefaultAppliedRef.current = true;
    setListModeState(mode);
    writeStoredListMode(mode);
  }, []);

  const allocatedOnly = listMode === 'allocated';
  const scopeReady = true;

  const {
    data: allocatedBedPatients,
    isLoading: allocatedPatientsLoading,
  } = useNurseBedPatientsQuery(
    { allocated_only: true, page: 1, page_size: 100 },
    { enabled: allocatedOnly },
  );

  const allocatedBedIdSet = useMemo(
    () => new Set((allocationSummary?.allocated_bed_ids ?? []).map(Number)),
    [allocationSummary?.allocated_bed_ids],
  );

  const allocatedPatientIdSet = useMemo(() => {
    if (!allocatedOnly) return new Set();
    const ids = new Set();
    for (const row of allocatedBedPatients?.items ?? []) {
      const id = Number(row?.patient_id);
      if (Number.isSafeInteger(id) && id >= 1) ids.add(id);
    }
    return ids;
  }, [allocatedOnly, allocatedBedPatients?.items]);

  const scopeFilters = useMemo(
    () => (allocatedOnly ? { allocated_only: true } : {}),
    [allocatedOnly],
  );

  const isPatientInScope = useCallback(
    (patientId) => {
      if (!allocatedOnly) return true;
      const id = Number(patientId);
      if (!Number.isSafeInteger(id) || id < 1) return false;
      return allocatedPatientIdSet.has(id);
    },
    [allocatedOnly, allocatedPatientIdSet],
  );

  const value = useMemo(
    () => ({
      listMode,
      setListMode,
      allocatedOnly,
      scopeReady,
      scopeFilters,
      allocationSummary,
      summaryLoading,
      allocatedBedIdSet,
      allocatedPatientIdSet,
      allocatedPatientsLoading,
      isPatientInScope,
    }),
    [
      listMode,
      setListMode,
      allocatedOnly,
      scopeReady,
      scopeFilters,
      allocationSummary,
      summaryLoading,
      allocatedBedIdSet,
      allocatedPatientIdSet,
      allocatedPatientsLoading,
      isPatientInScope,
    ],
  );

  return (
    <NursePatientScopeContext.Provider value={value}>
      {children}
    </NursePatientScopeContext.Provider>
  );
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

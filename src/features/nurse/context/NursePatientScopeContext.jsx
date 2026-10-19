import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  useNurseBedAllocationSummaryQuery,
  useNurseBedPatientsQuery,
} from '@/shared/hooks/queries/useNurseQuery';
import { useAuth } from '@/shared/hooks/useAuth';
import {
  readNurseListMode,
  writeNurseListMode,
} from '@/components/security/hospitalBrowserStorage';
import { NursePatientScopeContext } from '@/features/nurse/context/nursePatientScope';

function writeStoredListMode(mode) {
  writeNurseListMode(mode);
}

export function NursePatientScopeProvider({ children }) {
  const { user } = useAuth();
  const scopeKey = `${user?.tenant_id ?? ''}:${user?.user_id ?? user?.id ?? ''}`;
  const [listMode, setListModeState] = useState(() => readNurseListMode() ?? 'all');
  const userChosenRef = useRef(false);
  const autoDefaultAppliedRef = useRef(false);

  useEffect(() => {
    const stored = readNurseListMode();
    userChosenRef.current = Boolean(stored);
    autoDefaultAppliedRef.current = Boolean(stored);
    setListModeState(stored ?? 'all');
  }, [scopeKey]);

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
  }, [allocationSummary, summaryLoading, summaryError, scopeKey]);

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
    {
      // Keep loaded in All mode too so list pages can show Allocated / Outside Allocation tags.
      enabled: Boolean(allocationSummary?.has_allocations),
    },
  );

  const allocatedBedIdSet = useMemo(
    () => new Set((allocationSummary?.allocated_bed_ids ?? []).map(Number)),
    [allocationSummary?.allocated_bed_ids],
  );

  const allocatedPatientIdSet = useMemo(() => {
    const ids = new Set();
    for (const row of allocatedBedPatients?.items ?? []) {
      const id = Number(row?.patient_id);
      if (Number.isSafeInteger(id) && id >= 1) ids.add(id);
    }
    return ids;
  }, [allocatedBedPatients?.items]);

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

import { useNursePatientScope } from '@/features/nurse/context/NursePatientScopeContext';

/**
 * Allocated / Outside Allocation tags for patient name cells.
 * Only renders in All scope when the nurse has bed allocations.
 */
export default function NursePatientAllocationTags({ patientId }) {
  const { listMode, allocatedPatientIdSet, allocatedBedIdSet, allocationSummary } =
    useNursePatientScope();

  if (listMode !== 'all') return null;

  const hasAllocations =
    Boolean(allocationSummary?.has_allocations) || allocatedBedIdSet.size > 0;
  if (!hasAllocations) return null;

  const id = Number(patientId);
  const isAllocated = Number.isSafeInteger(id) && id >= 1 && allocatedPatientIdSet.has(id);

  return (
    <span className="nurse-patient-allocation-tags">
      {isAllocated ? (
        <span className="nurse-badge nurse-badge--allocated">Allocated</span>
      ) : (
        <span className="nurse-badge nurse-badge--outside-allocation">Outside Allocation</span>
      )}
    </span>
  );
}

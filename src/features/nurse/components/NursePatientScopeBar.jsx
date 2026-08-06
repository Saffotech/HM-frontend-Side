import { useLocation } from 'react-router-dom';
import { ROUTES } from '@/shared/constants';
import {
  formatNurseShiftLabel,
  useNursePatientScope,
} from '@/features/nurse/context/NursePatientScopeContext';

/** Exact list routes where All / Allocated changes the visible patient set. */
const SCOPE_LIST_PATHS = new Set([
  ROUTES.NURSE_DASHBOARD,
  ROUTES.NURSE_QUEUE,
  ROUTES.NURSE_VITALS,
  ROUTES.NURSE_NOTES,
  ROUTES.NURSE_MEDICATIONS,
  ROUTES.NURSE_MEDICATIONS_HISTORY,
  ROUTES.NURSE_ALERTS,
]);

function shouldShowScopeBar(pathname) {
  return SCOPE_LIST_PATHS.has(pathname);
}

export default function NursePatientScopeBar() {
  const { pathname } = useLocation();
  const {
    listMode,
    setListMode,
    allocationSummary,
  } = useNursePatientScope();

  if (!shouldShowScopeBar(pathname)) return null;

  return (
    <div className="nurse-scope-bar nurse-card">
      <div
        className="nurse-scope-bar__mode-toggle"
        role="tablist"
        aria-label="Patient list scope"
      >
        <button
          type="button"
          role="tab"
          aria-selected={listMode === 'allocated'}
          className={`nurse-scope-bar__mode-btn${
            listMode === 'allocated' ? ' is-active is-active--allocated' : ''
          }`}
          onClick={() => setListMode('allocated')}
        >
          Allocated
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={listMode === 'all'}
          className={`nurse-scope-bar__mode-btn${
            listMode === 'all' ? ' is-active is-active--all' : ''
          }`}
          onClick={() => setListMode('all')}
        >
          All
        </button>
      </div>

      {allocationSummary && (
        <div className="nurse-scope-bar__summary" aria-live="polite">
          <p className="nurse-scope-bar__shift">
            {formatNurseShiftLabel(allocationSummary.shift_name)}
          </p>
          <div className="nurse-scope-bar__stats">
            <span>
              Beds Assigned
              {' '}
              <strong>{allocationSummary.assigned_bed_count}</strong>
            </span>
            <span>
              Occupied
              {' '}
              <strong>{allocationSummary.occupied_count}</strong>
            </span>
            <span>
              Vacant
              {' '}
              <strong>{allocationSummary.vacant_count}</strong>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

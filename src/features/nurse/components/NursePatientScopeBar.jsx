import { useLocation } from 'react-router-dom';
import { ROUTES } from '@/shared/constants';
import {
  formatNurseShiftLabel,
  useNursePatientScope,
} from '@/features/nurse/context/NursePatientScopeContext';

const HIDDEN_PREFIXES = [
  ROUTES.NURSE_PROFILE,
  ROUTES.NURSE_NOTIFICATIONS,
  ROUTES.NURSE_MY_DUTY,
];

export default function NursePatientScopeBar() {
  const { pathname } = useLocation();
  const {
    listMode,
    setListMode,
    allocationSummary,
  } = useNursePatientScope();

  const hidden = HIDDEN_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  if (hidden) return null;

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
          className={`nurse-scope-bar__mode-btn ${listMode === 'allocated' ? 'is-active' : ''}`}
          onClick={() => setListMode('allocated')}
          disabled={listMode == null}
        >
          Allocated
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={listMode === 'all'}
          className={`nurse-scope-bar__mode-btn ${listMode === 'all' ? 'is-active' : ''}`}
          onClick={() => setListMode('all')}
          disabled={listMode == null}
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

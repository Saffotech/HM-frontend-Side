import { useMemo, useState } from 'react';

function wardKey(bed) {
  return String(bed.ward ?? bed.ward_name ?? 'Other').trim() || 'Other';
}

function bedIdOf(bed) {
  return Number(bed.dbId ?? bed.id);
}

function patientStatus(bed) {
  return String(bed.status || '').toLowerCase();
}

/**
 * Effective picker status:
 * - assigned: already has an active nurse allocation (unless allowed for this form)
 * - occupied / available: from bed occupancy
 */
function pickerStatus(bed, assignedSet, allowedAssignedSet) {
  const id = bedIdOf(bed);
  if (Number.isFinite(id) && assignedSet.has(id) && !allowedAssignedSet.has(id)) {
    return 'assigned';
  }
  return patientStatus(bed);
}

function sortBeds(a, b) {
  return String(a.bedNo ?? a.bed_number ?? '').localeCompare(
    String(b.bedNo ?? b.bed_number ?? ''),
    undefined,
    { numeric: true },
  );
}

function statusLabel(status, fallback) {
  if (status === 'available') return 'Avail';
  if (status === 'occupied') return 'Occ';
  if (status === 'assigned') return 'Assigned';
  return fallback || '—';
}

/**
 * Compact multi-select bed picker.
 * Row 1: Search + All · Available · Assigned
 * Row 2: All wards · General · ICU · Private · …
 * Then flat bed chip grid.
 *
 * @param {number[]} [assignedBedIds] — beds with an active nurse allocation
 * @param {number[]} [allowAssignedIds] — assigned beds still selectable (e.g. current edit group)
 */
export default function AdminBedMultiSelect({
  beds = [],
  selectedIds = [],
  onChange,
  disabled = false,
  isLoading = false,
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Search by bed number or ward…',
  assignedBedIds = [],
  allowAssignedIds = [],
}) {
  const [statusFilter, setStatusFilter] = useState('all');
  const [wardFilter, setWardFilter] = useState('all');
  const showSearch = typeof onSearchChange === 'function';

  const selectedSet = useMemo(() => new Set(selectedIds.map(Number)), [selectedIds]);
  const assignedSet = useMemo(
    () => new Set((assignedBedIds ?? []).map(Number).filter(Number.isFinite)),
    [assignedBedIds],
  );
  const allowedAssignedSet = useMemo(
    () => new Set((allowAssignedIds ?? []).map(Number).filter(Number.isFinite)),
    [allowAssignedIds],
  );

  const wardOptions = useMemo(() => {
    const counts = new Map();
    for (const bed of beds) {
      const key = wardKey(bed);
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    return Array.from(counts.entries())
      .map(([ward, count]) => ({ ward, count }))
      .sort((a, b) => a.ward.localeCompare(b.ward));
  }, [beds]);

  const filteredBeds = useMemo(() => {
    return beds
      .filter((bed) => {
        const status = pickerStatus(bed, assignedSet, allowedAssignedSet);
        if (statusFilter === 'available' && status !== 'available') return false;
        if (statusFilter === 'assigned' && status !== 'assigned') return false;
        if (wardFilter !== 'all' && wardKey(bed) !== wardFilter) return false;
        return true;
      })
      .slice()
      .sort((a, b) => {
        const wardCmp = wardKey(a).localeCompare(wardKey(b));
        if (wardCmp !== 0) return wardCmp;
        return sortBeds(a, b);
      });
  }, [beds, statusFilter, wardFilter, assignedSet, allowedAssignedSet]);

  const filterCounts = useMemo(() => {
    let available = 0;
    let assigned = 0;
    for (const bed of beds) {
      const status = pickerStatus(bed, assignedSet, allowedAssignedSet);
      if (status === 'available') available += 1;
      if (status === 'assigned') assigned += 1;
    }
    return {
      all: beds.length,
      available,
      assigned,
    };
  }, [beds, assignedSet, allowedAssignedSet]);

  const isBedLocked = (bedId) => {
    const id = Number(bedId);
    return assignedSet.has(id) && !allowedAssignedSet.has(id);
  };

  const toggle = (bedId) => {
    if (disabled) return;
    const id = Number(bedId);
    if (isBedLocked(id) && !selectedSet.has(id)) return;
    if (selectedSet.has(id)) {
      onChange(selectedIds.filter((x) => Number(x) !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  const selectShown = () => {
    if (disabled) return;
    const ids = filteredBeds
      .map(bedIdOf)
      .filter((id) => Number.isFinite(id) && !isBedLocked(id));
    onChange(Array.from(new Set([...selectedIds.map(Number), ...ids])));
  };

  const clearAll = () => {
    if (disabled) return;
    onChange([]);
  };

  if (isLoading) {
    return <p className="nba-muted">Loading beds…</p>;
  }

  if (!beds.length && !showSearch) {
    return <p className="nba-muted">No beds match the current filters.</p>;
  }

  return (
    <div className="nba-bed-select nba-bed-select--dense">
      <div className="nba-bed-select__toolbar">
        <div className="nba-bed-select__summary">
          <strong>{selectedIds.length}</strong>
          <span>selected</span>
          <span className="nba-bed-select__dot">·</span>
          <span>{filteredBeds.length} shown</span>
          <span className="nba-bed-select__dot">·</span>
          <span>{beds.length} total</span>
        </div>
        <div className="nba-bed-select__actions">
          <button type="button" className="nba-link-btn" onClick={selectShown} disabled={disabled}>
            Select shown
          </button>
          <button type="button" className="nba-link-btn" onClick={clearAll} disabled={disabled}>
            Clear selected
          </button>
        </div>
      </div>

      <div className="nba-bed-select__search-row">
        {showSearch ? (
          <label className="nba-bed-select__search">
            <span className="nba-sr-only">Search beds</span>
            <input
              type="search"
              className="nba-input nba-bed-select__search-input"
              value={searchValue ?? ''}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              disabled={disabled}
            />
          </label>
        ) : null}
        <div className="nba-bed-select__filters nba-bed-select__filters--inline" role="tablist" aria-label="Bed status filter">
          {[
            { id: 'all', label: 'All' },
            { id: 'available', label: 'Available' },
            { id: 'assigned', label: 'Assigned' },
          ].map((opt) => (
            <button
              key={opt.id}
              type="button"
              role="tab"
              aria-selected={statusFilter === opt.id}
              className={`nba-bed-filter${statusFilter === opt.id ? ' is-active' : ''}`}
              onClick={() => setStatusFilter(opt.id)}
            >
              {opt.label}
              <span className="nba-bed-filter__count">{filterCounts[opt.id]}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="nba-bed-select__filters nba-bed-select__filters--wards" role="tablist" aria-label="Ward filter">
        <button
          type="button"
          role="tab"
          aria-selected={wardFilter === 'all'}
          className={`nba-bed-filter${wardFilter === 'all' ? ' is-active' : ''}`}
          onClick={() => setWardFilter('all')}
        >
          All wards
          <span className="nba-bed-filter__count">{beds.length}</span>
        </button>
        {wardOptions.map(({ ward, count }) => (
          <button
            key={ward}
            type="button"
            role="tab"
            aria-selected={wardFilter === ward}
            className={`nba-bed-filter${wardFilter === ward ? ' is-active' : ''}`}
            onClick={() => setWardFilter(ward)}
          >
            {ward}
            <span className="nba-bed-filter__count">{count}</span>
          </button>
        ))}
      </div>

      {!beds.length ? (
        <p className="nba-muted">No beds match the current filters.</p>
      ) : !filteredBeds.length ? (
        <p className="nba-muted">No beds match this filter.</p>
      ) : (
        <div className="nba-bed-select__grid nba-bed-select__grid--scroll">
          {filteredBeds.map((bed) => {
            const id = bedIdOf(bed);
            const checked = selectedSet.has(id);
            const status = pickerStatus(bed, assignedSet, allowedAssignedSet);
            const locked = isBedLocked(id);
            const ward = wardKey(bed);
            return (
              <label
                key={id}
                className={`nba-bed-chip${checked ? ' is-selected' : ''}${disabled || locked ? ' is-disabled' : ''}`}
                title={
                  locked
                    ? `${bed.bedNo ?? bed.bed_number} · ${ward} · Already assigned to a nurse`
                    : `${bed.bedNo ?? bed.bed_number} · ${ward} · ${statusLabel(status, bed.status)}`
                }
              >
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={disabled || (locked && !checked)}
                  onChange={() => toggle(id)}
                />
                <span className="nba-bed-chip__text">
                  <span className="nba-bed-chip__no">{bed.bedNo ?? bed.bed_number}</span>
                  <span className="nba-bed-chip__ward">{ward}</span>
                </span>
                <span className={`nba-bed-chip__status nba-bed-chip__status--${status || 'unknown'}`}>
                  {statusLabel(status, bed.status)}
                </span>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}

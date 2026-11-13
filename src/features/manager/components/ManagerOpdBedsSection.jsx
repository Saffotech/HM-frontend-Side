import { useEffect, useMemo, useState } from 'react';
import {
  Ban,
  BedDouble,
  CheckCircle2,
  ChevronDown,
  Layers,
  Pencil,
  Plus,
  Trash2,
  UserRound,
} from 'lucide-react';
import {
  useActivateInventoryBedMutation,
  useActivateInventoryWardMutation,
  useBedInventoryListQuery,
  useBedInventorySummaryQuery,
  useCreateInventoryBedMutation,
  useCreateInventoryBedsBulkMutation,
  useDeleteInventoryBedMutation,
  useDeleteInventoryWardMutation,
  useUpdateInventoryBedMutation,
} from '@/features/manager/hooks/useOpdBedsQuery';
import { Button, ConfirmDialog, Input, QueryFeedback } from '@/shared/components/common';
import { toast } from '@/shared/utils/toast';

const WARD_PREFIX = {
  General: 'G-',
  ICU: 'ICU-',
  Private: 'P-',
  Pediatric: 'Ped-',
};

function SectionCard({
  title,
  icon: Icon,
  children,
  tone = 'teal',
  action = null,
  className = '',
  collapsible = false,
  defaultOpen = false,
  locked = false,
}) {
  const [open, setOpen] = useState(defaultOpen);
  const showBody = !collapsible || open;
  const toneClass = `aos-card--tone-${tone}`;

  return (
    <section
      className={`aos-card ${toneClass}${collapsible ? ' aos-card--accordion' : ''}${
        collapsible && open ? ' is-open' : ''
      }${locked ? ' aos-card--locked' : ''} ${className}`.trim()}
    >
      {collapsible ? (
        <div className="aos-card__head aos-card__head--row">
          <button
            type="button"
            className="aos-card__head-toggle"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
          >
            <div className="aos-card__title-wrap">
              {Icon ? (
                <span className="aos-card__icon" aria-hidden>
                  <Icon size={16} strokeWidth={2.2} />
                </span>
              ) : null}
              <h3 className="aos-card__title">{title}</h3>
            </div>
            <ChevronDown
              size={18}
              className={`aos-card__chevron${open ? ' is-open' : ''}`}
              aria-hidden
            />
          </button>
          {action ? <div className="aos-card__head-action">{action}</div> : null}
        </div>
      ) : (
        <div className="aos-card__head">
          <div className="aos-card__title-wrap">
            {Icon ? (
              <span className="aos-card__icon" aria-hidden>
                <Icon size={16} strokeWidth={2.2} />
              </span>
            ) : null}
            <h3 className="aos-card__title">{title}</h3>
          </div>
          {action}
        </div>
      )}
      {showBody ? (
        <div className="aos-card__body">
          {locked ? (
            <p className="aos-locked-banner">
              Locked by Admin — you can view these settings but cannot change them.
            </p>
          ) : null}
          {children}
        </div>
      ) : null}
    </section>
  );
}

function formatBedId(prefix, n, pad = 0) {
  const num = pad > 0 ? String(n).padStart(pad, '0') : String(n);
  return `${prefix ?? ''}${num}`;
}

function existingBedSet(beds) {
  return new Set(
    (beds ?? []).map((b) => String(b.bed_number || '').trim().toLowerCase()).filter(Boolean)
  );
}

/** Next free numeric suffix for a prefix across all beds (bed numbers are globally unique). */
function nextNumberForPrefix(beds, prefix) {
  const p = prefix ?? '';
  let max = null;
  for (const b of beds ?? []) {
    const bn = String(b.bed_number || '');
    if (p) {
      if (!bn.toLowerCase().startsWith(p.toLowerCase())) continue;
      const rest = bn.slice(p.length);
      if (!/^\d+$/.test(rest)) continue;
      const n = Number(rest);
      if (max === null || n > max) max = n;
    } else if (/^\d+$/.test(bn)) {
      const n = Number(bn);
      if (max === null || n > max) max = n;
    }
  }
  return max === null ? 101 : max + 1;
}

function defaultPrefixForWard(ward) {
  if (!ward) return 'G-';
  if (WARD_PREFIX[ward]) return WARD_PREFIX[ward];
  const clean = ward.replace(/[^a-zA-Z0-9]/g, '').slice(0, 4);
  return clean ? `${clean}-` : 'W-';
}

function bedHadPatient(bed) {
  if (!bed) return false;
  return (
    Boolean(bed.has_patient_history) ||
    bed.patient_id != null ||
    String(bed.status || '').toLowerCase() === 'occupied'
  );
}

function buildBulkIds(form) {
  const start = Number(form.start_number) || 0;
  const count = Math.min(Math.max(Number(form.count) || 0, 0), 100);
  const pad = Number(form.pad_width) || 0;
  const prefix = form.prefix ?? '';
  if (!count) return [];
  return Array.from({ length: count }, (_, i) => formatBedId(prefix, start + i, pad));
}

/* Legacy identifier preserved: AdminOpdBedsSection. Active name: ManagerOpdBedsSection. */
export default function ManagerOpdBedsSection({
  canEditBedInventory = true,
  canEditWards = true,
  canEditAllBeds = true,
  lockToggle = () => null,
}) {
  const [wardFilter, setWardFilter] = useState('all');
  const [bedTypeFilter, setBedTypeFilter] = useState('all');
  const [lifecycleFilter, setLifecycleFilter] = useState('active');
  const [wardLifecycleFilter, setWardLifecycleFilter] = useState('active');
  const [addMode, setAddMode] = useState('single'); // single | bulk | ward
  const [wardName, setWardName] = useState('');
  const [customWards, setCustomWards] = useState([]);
  const [newWardName, setNewWardName] = useState('');
  const [pendingWardDelete, setPendingWardDelete] = useState(null);
  const [pendingBedDelete, setPendingBedDelete] = useState(null);
  const [pendingWardActivate, setPendingWardActivate] = useState(null);
  const [pendingBedActivate, setPendingBedActivate] = useState(null);
  const [singleBedNumber, setSingleBedNumber] = useState('');
  const [bulkForm, setBulkForm] = useState({
    prefix: '',
    start_number: 1,
    count: 1,
    pad_width: 0,
  });
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({
    bed_number: '',
    ward_name: '',
    bed_type: 'single',
  });
  const [startTouched, setStartTouched] = useState(false);
  const [singleTouched, setSingleTouched] = useState(false);
  const [bedType, setBedType] = useState('single');

  const summaryQ = useBedInventorySummaryQuery();
  // Load every bed so Active / Inactive / All can filter locally, and so a
  // deactivated bed number still counts as taken.
  const listQ = useBedInventoryListQuery({ status_filter: 'all' });
  const createMut = useCreateInventoryBedMutation();
  const bulkMut = useCreateInventoryBedsBulkMutation();
  const updateMut = useUpdateInventoryBedMutation();
  const deleteMut = useDeleteInventoryBedMutation();
  const deleteWardMut = useDeleteInventoryWardMutation();
  const activateMut = useActivateInventoryBedMutation();
  const activateWardMut = useActivateInventoryWardMutation();

  const allBeds = useMemo(() => listQ.data?.beds ?? [], [listQ.data?.beds]);
  const activeInventory = useMemo(
    () => allBeds.filter((bed) => bed.is_active !== false),
    [allBeds],
  );
  const beds = allBeds.filter((b) => {
    const isActive = b.is_active !== false;
    if (lifecycleFilter === 'active' && !isActive) return false;
    if (lifecycleFilter === 'inactive' && isActive) return false;
    if (wardFilter !== 'all' && b.ward_name !== wardFilter) return false;
    const type = b.bed_type === 'double' ? 'double' : 'single';
    if (bedTypeFilter !== 'all' && type !== bedTypeFilter) return false;
    return true;
  });

  const summaryTotals = summaryQ.data?.totals;
  const total = Number(summaryTotals?.beds ?? summaryTotals?.total ?? activeInventory.length);
  const available = Number(
    summaryTotals?.available ??
      activeInventory.filter((bed) => String(bed.status).toLowerCase() !== 'occupied').length,
  );
  const occupied = Number(
    summaryTotals?.occupied ??
      activeInventory.filter((bed) => String(bed.status).toLowerCase() === 'occupied').length,
  );
  const wardCount = Number(summaryQ.data?.totals?.wards ?? 0);

  const taken = useMemo(() => existingBedSet(allBeds), [allBeds]);

  const wardOptions = useMemo(() => {
    const fromBeds = allBeds.map((b) => b.ward_name);
    const fromSummary = (summaryQ.data?.wards ?? []).map((w) => w.ward_name);
    return [...new Set([...fromSummary, ...fromBeds, ...customWards])]
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b));
  }, [summaryQ.data?.wards, allBeds, customWards]);

  // Prefer live inventory wards — never hardcode General/ICU unless they exist in DB.
  useEffect(() => {
    if (!wardName && wardOptions.length) {
      setWardName(wardOptions[0]);
    } else if (wardName && wardOptions.length && !wardOptions.includes(wardName)) {
      setWardName(wardOptions[0] || '');
    }
  }, [wardOptions, wardName]);

  const suggestedStart = useMemo(
    () => nextNumberForPrefix(allBeds, bulkForm.prefix),
    [allBeds, bulkForm.prefix]
  );

  const suggestedSingle = useMemo(
    () => formatBedId(bulkForm.prefix, suggestedStart, Number(bulkForm.pad_width) || 0),
    [bulkForm.prefix, bulkForm.pad_width, suggestedStart]
  );

  // Keep start / single bed number on the next free value unless user typed over it.
  useEffect(() => {
    if (!startTouched) {
      setBulkForm((p) =>
        Number(p.start_number) === suggestedStart ? p : { ...p, start_number: suggestedStart }
      );
    }
  }, [suggestedStart, startTouched]);

  useEffect(() => {
    if (!singleTouched) {
      setSingleBedNumber(suggestedSingle);
    }
  }, [suggestedSingle, singleTouched]);

  // When ward changes, refresh default prefix for that ward.
  useEffect(() => {
    if (addMode === 'ward') return;
    const nextPrefix = defaultPrefixForWard(wardName);
    setBulkForm((p) => (p.prefix === nextPrefix ? p : { ...p, prefix: nextPrefix }));
    setStartTouched(false);
    setSingleTouched(false);
  }, [wardName, addMode]);

  const bulkIds = useMemo(() => buildBulkIds(bulkForm), [bulkForm]);
  const bulkConflicts = useMemo(
    () => bulkIds.filter((id) => taken.has(id.toLowerCase())),
    [bulkIds, taken]
  );
  const previewBeds = bulkIds.slice(0, 5);
  const previewExtra = Math.max(bulkIds.length - previewBeds.length, 0);

  const singleConflict =
    Boolean(singleBedNumber.trim()) && taken.has(singleBedNumber.trim().toLowerCase());

  const busy =
    createMut.isPending ||
    bulkMut.isPending ||
    updateMut.isPending ||
    deleteMut.isPending ||
    deleteWardMut.isPending ||
    activateMut.isPending ||
    activateWardMut.isPending;

  const wardRows = useMemo(() => {
    const byName = new Map();
    for (const bed of allBeds) {
      const name = bed.ward_name;
      if (!name) continue;
      if (!byName.has(name)) {
        byName.set(name, {
          ward_name: name,
          total: 0,
          active: 0,
          occupied: 0,
          hasPatientHistory: false,
        });
      }
      const row = byName.get(name);
      row.total += 1;
      if (bed.is_active !== false) {
        row.active += 1;
        if (String(bed.status).toLowerCase() === 'occupied') row.occupied += 1;
      }
      if (bedHadPatient(bed)) row.hasPatientHistory = true;
    }
    for (const name of customWards) {
      if (!byName.has(name)) {
        byName.set(name, {
          ward_name: name,
          total: 0,
          active: 0,
          occupied: 0,
          hasPatientHistory: false,
        });
      }
    }
    return [...byName.values()]
      .map((row) => ({ ...row, isInactive: row.total > 0 && row.active === 0 }))
      .sort((a, b) => a.ward_name.localeCompare(b.ward_name));
  }, [allBeds, customWards]);

  const visibleWards = wardRows.filter((ward) => {
    if (wardLifecycleFilter === 'inactive') return ward.isInactive;
    if (wardLifecycleFilter === 'active') return !ward.isInactive;
    return true;
  });

  const handleDeleteWard = (ward) => {
    if (!canEditWards) return;
    const occupiedCount = Number(ward.occupied ?? 0);
    if (occupiedCount > 0) {
      toast.error(
        `Cannot deactivate "${ward.ward_name}" — ${occupiedCount} bed(s) still occupied. Release patients first.`
      );
      return;
    }
    setPendingWardDelete(ward);
  };

  const confirmDeleteWard = async () => {
    const ward = pendingWardDelete;
    if (!ward || !canEditWards) return;
    setPendingWardDelete(null);

    const bedCount = Number(ward.total ?? 0);
    if (bedCount === 0) {
      setCustomWards((prev) => prev.filter((w) => w !== ward.ward_name));
      if (wardName === ward.ward_name) setWardName('');
      if (wardFilter === ward.ward_name) setWardFilter('all');
      toast.success(`Ward "${ward.ward_name}" removed`);
      return;
    }

    try {
      const result = await deleteWardMut.mutateAsync(ward.ward_name);
      if (!ward.hasPatientHistory) {
        setCustomWards((prev) => prev.filter((w) => w !== ward.ward_name));
        if (wardName === ward.ward_name) setWardName('');
        if (wardFilter === ward.ward_name) setWardFilter('all');
      }
      toast.success(result?.message || `Ward "${ward.ward_name}" updated`);
      setStartTouched(false);
      setSingleTouched(false);
    } catch (err) {
      toast.error(err?.message || 'Failed to delete ward');
    }
  };

  const handleAddWard = (e) => {
    e.preventDefault();
    if (!canEditBedInventory) return;
    const name = newWardName.trim();
    if (!name) {
      toast.error('Ward name is required');
      return;
    }
    const exists = wardOptions.some((w) => w.toLowerCase() === name.toLowerCase());
    if (exists) {
      toast.error(`Ward "${name}" already exists`);
      return;
    }
    setCustomWards((prev) => [...prev, name]);
    setWardName(name);
    const prefix = defaultPrefixForWard(name);
    setBulkForm((p) => ({ ...p, prefix }));
    setNewWardName('');
    setStartTouched(false);
    setSingleTouched(false);
    setAddMode('bulk');
    toast.success(`Ward "${name}" added — now add beds`);
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!canEditBedInventory) return;
    if (!wardName?.trim()) {
      toast.error('Select a ward');
      return;
    }

    if (addMode === 'single') {
      const bedNumber = singleBedNumber.trim();
      if (!bedNumber) {
        toast.error('Bed number is required');
        return;
      }
      if (taken.has(bedNumber.toLowerCase())) {
        toast.error(`Bed ${bedNumber} already exists — use ${suggestedSingle}`);
        setSingleBedNumber(suggestedSingle);
        setSingleTouched(false);
        return;
      }
      try {
        await createMut.mutateAsync({
          ward_name: wardName.trim(),
          bed_number: bedNumber,
          bed_type: bedType,
        });
        toast.success(`Bed ${bedNumber} added`);
        setSingleTouched(false);
        setStartTouched(false);
      } catch (err) {
        toast.error(err?.message || 'Failed to add bed');
      }
      return;
    }

    const count = Number(bulkForm.count);
    if (!Number.isFinite(count) || count < 1) {
      toast.error('Count must be at least 1');
      return;
    }
    if (bulkConflicts.length) {
      toast.error(
        `Already exists: ${bulkConflicts.slice(0, 3).join(', ')}${
          bulkConflicts.length > 3 ? '…' : ''
        }. Start from ${suggestedStart}.`
      );
      setBulkForm((p) => ({ ...p, start_number: suggestedStart }));
      setStartTouched(false);
      return;
    }
    try {
      const result = await bulkMut.mutateAsync({
        ward_name: wardName.trim(),
        prefix: bulkForm.prefix ?? '',
        start_number: Number(bulkForm.start_number) || 1,
        count,
        pad_width: Number(bulkForm.pad_width) || 0,
        bed_type: bedType,
      });
      toast.success(`${result?.created_count ?? count} bed(s) added to ${wardName}`);
      setStartTouched(false);
      setSingleTouched(false);
    } catch (err) {
      toast.error(err?.message || 'Failed to add beds');
    }
  };

  const startEdit = (bed) => {
    if (!canEditAllBeds) return;
    setEditingId(bed.id);
    setEditForm({
      bed_number: bed.bed_number,
      ward_name: bed.ward_name,
      bed_type: bed.bed_type === 'double' ? 'double' : 'single',
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({ bed_number: '', ward_name: '', bed_type: 'single' });
  };

  const saveEdit = async (bedId) => {
    if (!canEditAllBeds) return;
    if (!editForm.bed_number?.trim() || !editForm.ward_name?.trim()) {
      toast.error('Ward and bed number are required');
      return;
    }
    const nextNum = editForm.bed_number.trim();
    const current = allBeds.find((b) => b.id === bedId);
    if (
      taken.has(nextNum.toLowerCase()) &&
      String(current?.bed_number || '').toLowerCase() !== nextNum.toLowerCase()
    ) {
      toast.error(`Bed ${nextNum} already exists`);
      return;
    }
    try {
      await updateMut.mutateAsync({
        bedId,
        body: {
          bed_number: nextNum,
          ward_name: editForm.ward_name.trim(),
          bed_type: editForm.bed_type === 'double' ? 'double' : 'single',
        },
      });
      toast.success('Bed updated');
      cancelEdit();
    } catch (err) {
      toast.error(err?.message || 'Failed to update bed');
    }
  };

  const handleDelete = (bed) => {
    if (!canEditAllBeds) return;
    if (String(bed.status).toLowerCase() === 'occupied') {
      toast.error('Release the patient before deactivating this bed');
      return;
    }
    setPendingBedDelete(bed);
  };

  const confirmDeleteBed = async () => {
    const bed = pendingBedDelete;
    if (!bed || !canEditAllBeds) return;
    setPendingBedDelete(null);

    const currentBed = allBeds.find((item) => item.id === bed.id);
    if (String(currentBed?.status ?? bed.status).toLowerCase() === 'occupied') {
      toast.error('Release the patient before deactivating this bed');
      return;
    }

    try {
      const result = await deleteMut.mutateAsync(bed.id);
      toast.success(
        result?.message ||
          (bedHadPatient(bed)
            ? `Bed ${bed.bed_number} deactivated`
            : `Bed ${bed.bed_number} deleted`)
      );
      if (editingId === bed.id) cancelEdit();
      setStartTouched(false);
      setSingleTouched(false);
    } catch (err) {
      toast.error(err?.message || 'Failed to update bed');
    }
  };

  const confirmActivateBed = async () => {
    const bed = pendingBedActivate;
    if (!bed || !canEditAllBeds) return;
    setPendingBedActivate(null);
    try {
      const result = await activateMut.mutateAsync(bed.id);
      toast.success(result?.message || `Bed ${bed.bed_number} activated`);
    } catch (err) {
      toast.error(err?.message || 'Failed to activate bed');
    }
  };

  const confirmActivateWard = async () => {
    const ward = pendingWardActivate;
    if (!ward || !canEditWards) return;
    setPendingWardActivate(null);
    try {
      const result = await activateWardMut.mutateAsync(ward.ward_name);
      toast.success(result?.message || `Ward "${ward.ward_name}" activated`);
    } catch (err) {
      toast.error(err?.message || 'Failed to activate ward');
    }
  };

  return (
    <div className="aos-beds">
      <SectionCard
        title="Bed inventory"
        icon={BedDouble}
        tone="teal"
        className="aos-beds__hero"
        locked={!canEditBedInventory}
        action={lockToggle('bed_inventory')}
      >
        <div className="aos-beds__stats" role="list">
          <div className="aos-beds__stat aos-beds__stat--total" role="listitem">
            <span className="aos-beds__stat-icon" aria-hidden>
              <BedDouble size={16} strokeWidth={2.2} />
            </span>
            <div className="aos-beds__stat-copy">
              <span>Total beds</span>
              <strong>{total}</strong>
            </div>
          </div>
          <div className="aos-beds__stat aos-beds__stat--available" role="listitem">
            <span className="aos-beds__stat-icon" aria-hidden>
              <CheckCircle2 size={16} strokeWidth={2.2} />
            </span>
            <div className="aos-beds__stat-copy">
              <span>Available</span>
              <strong>{available}</strong>
            </div>
          </div>
          <div className="aos-beds__stat aos-beds__stat--occupied" role="listitem">
            <span className="aos-beds__stat-icon" aria-hidden>
              <UserRound size={16} strokeWidth={2.2} />
            </span>
            <div className="aos-beds__stat-copy">
              <span>Occupied</span>
              <strong>{occupied}</strong>
            </div>
          </div>
          <div className="aos-beds__stat aos-beds__stat--wards" role="listitem">
            <span className="aos-beds__stat-icon" aria-hidden>
              <Layers size={16} strokeWidth={2.2} />
            </span>
            <div className="aos-beds__stat-copy">
              <span>Wards</span>
              <strong>{Math.max(wardCount, wardOptions.length)}</strong>
            </div>
          </div>
        </div>
      </SectionCard>

      <div
        className={`aos-beds__toolbar${!canEditBedInventory ? ' aos-beds__toolbar--locked' : ''}`}
      >
        <div className="aos-beds__mode" role="tablist" aria-label="Add mode">
          <button
            type="button"
            role="tab"
            aria-selected={addMode === 'single'}
            className={`aos-beds__mode-btn${addMode === 'single' ? ' is-active' : ''}`}
            onClick={() => setAddMode('single')}
          >
            One bed
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={addMode === 'bulk'}
            className={`aos-beds__mode-btn${addMode === 'bulk' ? ' is-active' : ''}`}
            onClick={() => setAddMode('bulk')}
          >
            Multiple
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={addMode === 'ward'}
            className={`aos-beds__mode-btn${addMode === 'ward' ? ' is-active' : ''}`}
            onClick={() => setAddMode('ward')}
          >
            New ward
          </button>
        </div>

        {addMode === 'ward' ? (
          <div className="aos-beds__compact">
            <label className="aos-beds__compact-field aos-beds__compact-field--grow">
              <span>Ward name</span>
              <Input
                value={newWardName}
                onChange={(e) => setNewWardName(e.target.value)}
                placeholder="e.g. Maternity"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddWard(e);
                  }
                }}
              />
            </label>
            <Button
              type="button"
              size="sm"
              className="aos-beds__compact-submit"
              onClick={handleAddWard}
            >
              <Plus size={14} /> Add ward
            </Button>
          </div>
        ) : (
          <div className="aos-beds__compact">
            <label className="aos-beds__compact-field">
              <span>Ward</span>
              <select
                className="aos-select aos-select--sm"
                value={wardName}
                onChange={(e) => setWardName(e.target.value)}
                aria-label="Ward"
              >
                {wardOptions.length === 0 ? (
                  <option value="">Add a ward first</option>
                ) : null}
                {wardOptions.map((w) => (
                  <option key={w} value={w}>
                    {w}
                  </option>
                ))}
              </select>
            </label>

            <label className="aos-beds__compact-field aos-beds__compact-field--type">
              <span>Type</span>
              <select
                className="aos-select aos-select--sm"
                value={bedType}
                onChange={(e) => setBedType(e.target.value)}
                aria-label="Bed type"
              >
                <option value="single">Single</option>
                <option value="double">Double</option>
              </select>
            </label>

            {addMode === 'single' ? (
              <label className="aos-beds__compact-field aos-beds__compact-field--grow">
                <span>Bed number</span>
                <Input
                  value={singleBedNumber}
                  onChange={(e) => {
                    setSingleTouched(true);
                    setSingleBedNumber(e.target.value);
                  }}
                  placeholder={suggestedSingle}
                  aria-invalid={singleConflict}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAdd(e);
                    }
                  }}
                />
              </label>
            ) : (
              <>
                <label className="aos-beds__compact-field aos-beds__compact-field--xs">
                  <span>Start</span>
                  <Input
                    type="number"
                    min={0}
                    value={bulkForm.start_number}
                    onChange={(e) => {
                      setStartTouched(true);
                      setBulkForm((p) => ({ ...p, start_number: e.target.value }));
                    }}
                    aria-invalid={bulkConflicts.length > 0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAdd(e);
                      }
                    }}
                  />
                </label>
                <label className="aos-beds__compact-field aos-beds__compact-field--xs">
                  <span>Count</span>
                  <Input
                    type="number"
                    min={1}
                    max={100}
                    value={bulkForm.count}
                    onChange={(e) => setBulkForm((p) => ({ ...p, count: e.target.value }))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAdd(e);
                      }
                    }}
                  />
                </label>
              </>
            )}

            <Button
              type="button"
              size="sm"
              className="aos-beds__compact-submit"
              disabled={
                busy ||
                (addMode === 'single' ? singleConflict : bulkConflicts.length > 0)
              }
              onClick={handleAdd}
            >
              <Plus size={14} />
              {addMode === 'single' ? 'Add' : 'Add beds'}
            </Button>
          </div>
        )}

        {addMode === 'single' && singleConflict ? (
          <p className="aos-beds__warn">
            <strong>{singleBedNumber.trim()}</strong> already exists. Next free:{' '}
            <button
              type="button"
              className="aos-beds__warn-link"
              onClick={() => {
                setSingleBedNumber(suggestedSingle);
                setSingleTouched(false);
              }}
            >
              {suggestedSingle}
            </button>
          </p>
        ) : null}

        {addMode === 'bulk' && bulkIds.length > 0 ? (
          <div className="aos-beds__preview aos-beds__preview--inline" aria-live="polite">
            <span className="aos-beds__preview-label">
              {bulkConflicts.length ? 'Conflicts' : 'Will create'}
            </span>
            <div className="aos-beds__preview-chips">
              {previewBeds.map((id) => (
                <span
                  key={id}
                  className={`aos-beds__chip${
                    taken.has(id.toLowerCase()) ? ' aos-beds__chip--conflict' : ''
                  }`}
                >
                  {id}
                </span>
              ))}
              {previewExtra > 0 ? (
                <span className="aos-beds__chip aos-beds__chip--more">+{previewExtra} more</span>
              ) : null}
            </div>
            {bulkConflicts.length ? (
              <button
                type="button"
                className="aos-beds__warn-link"
                onClick={() => {
                  setBulkForm((p) => ({ ...p, start_number: suggestedStart }));
                  setStartTouched(false);
                }}
              >
                Use next free ({suggestedStart})
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      <SectionCard
        title="Wards"
        icon={Layers}
        tone="indigo"
        collapsible
        defaultOpen={false}
        locked={!canEditWards}
        action={
          <div className="aos-beds__list-actions">
            <select
              className="aos-select aos-select--sm aos-beds__filter aos-beds__filter--lifecycle"
              value={wardLifecycleFilter}
              onChange={(e) => setWardLifecycleFilter(e.target.value)}
              aria-label="Filter wards by active or inactive"
              onClick={(e) => e.stopPropagation()}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="all">All</option>
            </select>
            {lockToggle('wards')}
          </div>
        }
      >
        <p className="aos-card__hint">
          A ward is deleted only when no bed in it has ever had a patient. If any bed was
          admitted or discharged, the whole ward is deactivated and can be activated again.
          Occupied beds must be released first.
        </p>
        {visibleWards.length === 0 ? (
          <p className="aos-beds__ward-empty">
            {wardRows.length === 0
              ? 'No wards yet. Use New ward above.'
              : wardLifecycleFilter === 'inactive'
                ? 'No inactive wards.'
                : 'No active wards.'}
          </p>
        ) : (
          <ul className="aos-beds__ward-list">
            {visibleWards.map((ward) => {
              const blocked = Number(ward.occupied ?? 0) > 0;
              const deactivateWard = Boolean(ward.hasPatientHistory);
              return (
                <li key={ward.ward_name} className="aos-beds__ward-row">
                  <div className="aos-beds__ward-meta">
                    <strong>{ward.ward_name}</strong>
                    <span>
                      {ward.total} bed{ward.total === 1 ? '' : 's'}
                      {ward.occupied > 0 ? ` · ${ward.occupied} occupied` : ''}
                    </span>
                    {ward.isInactive ? (
                      <span className="aos-beds__status aos-beds__status--inactive">
                        <span className="aos-beds__status-dot" aria-hidden />
                        Inactive
                      </span>
                    ) : null}
                  </div>
                  {canEditWards && ward.isInactive ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="aos-beds__icon-btn aos-beds__icon-btn--activate"
                      disabled={busy}
                      title={`Activate ward ${ward.ward_name}`}
                      onClick={() => setPendingWardActivate(ward)}
                    >
                      <CheckCircle2 size={14} />
                      <span>Activate ward</span>
                    </Button>
                  ) : canEditWards ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className={`aos-beds__icon-btn${
                        deactivateWard ? '' : ' aos-beds__icon-btn--danger'
                      }`}
                      disabled={busy || blocked}
                      title={
                        blocked
                          ? 'Release occupied beds before deactivating this ward'
                          : deactivateWard
                            ? `Deactivate ward ${ward.ward_name}`
                            : `Delete ward ${ward.ward_name}`
                      }
                      onClick={() => handleDeleteWard(ward)}
                    >
                      {deactivateWard ? <Ban size={14} /> : <Trash2 size={14} />}
                      <span>{deactivateWard ? 'Deactivate ward' : 'Delete ward'}</span>
                    </Button>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </SectionCard>

      <ConfirmDialog
        isOpen={Boolean(pendingWardDelete)}
        title={pendingWardDelete?.hasPatientHistory ? 'Deactivate ward?' : 'Delete ward?'}
        message={
          Number(pendingWardDelete?.total ?? 0) === 0
            ? `Remove "${pendingWardDelete?.ward_name}"?`
            : pendingWardDelete?.hasPatientHistory
              ? `Deactivate "${pendingWardDelete.ward_name}"? Every bed in this ward will be deactivated. Patient history is kept, and you can activate the ward again later.`
              : `Delete "${pendingWardDelete.ward_name}" and its ${pendingWardDelete.total} unused bed(s)? No patient has used this ward. This cannot be undone.`
        }
        confirmLabel={pendingWardDelete?.hasPatientHistory ? 'Deactivate ward' : 'Delete ward'}
        onConfirm={confirmDeleteWard}
        onCancel={() => setPendingWardDelete(null)}
      />

      <ConfirmDialog
        isOpen={Boolean(pendingWardActivate)}
        title="Activate ward?"
        message={`Activate "${pendingWardActivate?.ward_name}" and put its ${pendingWardActivate?.total} bed(s) back into inventory?`}
        confirmLabel="Activate ward"
        onConfirm={confirmActivateWard}
        onCancel={() => setPendingWardActivate(null)}
      />

      <ConfirmDialog
        isOpen={Boolean(pendingBedDelete)}
        title={bedHadPatient(pendingBedDelete) ? 'Deactivate bed?' : 'Delete bed?'}
        message={
          bedHadPatient(pendingBedDelete)
            ? `Deactivate bed "${pendingBedDelete?.bed_number}" in "${pendingBedDelete?.ward_name}"? A patient was admitted or discharged here, so the bed and its history stay on record. You can activate it again later.`
            : `Delete bed "${pendingBedDelete?.bed_number}" from "${pendingBedDelete?.ward_name}"? This bed has never had a patient, so it will be removed.`
        }
        confirmLabel={bedHadPatient(pendingBedDelete) ? 'Deactivate bed' : 'Delete bed'}
        onConfirm={confirmDeleteBed}
        onCancel={() => setPendingBedDelete(null)}
      />

      <ConfirmDialog
        isOpen={Boolean(pendingBedActivate)}
        title="Activate bed?"
        message={`Activate bed "${pendingBedActivate?.bed_number}" in "${pendingBedActivate?.ward_name}" and put it back into inventory?`}
        confirmLabel="Activate bed"
        onConfirm={confirmActivateBed}
        onCancel={() => setPendingBedActivate(null)}
      />

      <SectionCard
        title="All beds"
        icon={BedDouble}
        tone="amber"
        collapsible
        defaultOpen={false}
        locked={!canEditAllBeds}
        action={
          <div className="aos-beds__list-actions">
            {lockToggle('all_beds')}
            <span className="aos-beds__list-count">
              {beds.length} bed{beds.length === 1 ? '' : 's'}
            </span>
            <select
              className="aos-select aos-select--sm aos-beds__filter aos-beds__filter--ward"
              value={wardFilter}
              onChange={(e) => setWardFilter(e.target.value)}
              aria-label="Filter by ward"
              onClick={(e) => e.stopPropagation()}
            >
              <option value="all">All wards</option>
              {wardOptions.map((w) => (
                <option key={w} value={w}>
                  {w}
                </option>
              ))}
            </select>
            <select
              className="aos-select aos-select--sm aos-beds__filter aos-beds__filter--type"
              value={bedTypeFilter}
              onChange={(e) => setBedTypeFilter(e.target.value)}
              aria-label="Filter by bed type"
              onClick={(e) => e.stopPropagation()}
            >
              <option value="all">All types</option>
              <option value="single">Single</option>
              <option value="double">Double</option>
            </select>
            <select
              className="aos-select aos-select--sm aos-beds__filter aos-beds__filter--lifecycle"
              value={lifecycleFilter}
              onChange={(e) => setLifecycleFilter(e.target.value)}
              aria-label="Filter by active or inactive"
              onClick={(e) => e.stopPropagation()}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="all">All</option>
            </select>
          </div>
        }
      >
        <QueryFeedback
          isLoading={listQ.isLoading}
          isError={listQ.isError}
          error={listQ.error}
          onRetry={listQ.refetch}
        >
          {beds.length === 0 ? (
            <div className="aos-beds__empty">
              <span className="aos-beds__empty-icon" aria-hidden>
                <BedDouble size={22} strokeWidth={2} />
              </span>
              <strong>
                {lifecycleFilter === 'inactive' ? 'No inactive beds' : 'No beds yet'}
              </strong>
              <p>
                {lifecycleFilter === 'inactive'
                  ? 'Deactivated beds will appear here.'
                  : lifecycleFilter === 'all'
                    ? 'No beds match these filters.'
                    : 'Add a ward or beds above to start your inventory.'}
              </p>
            </div>
          ) : (
            <div className="aos-table-wrap aos-beds__table-wrap">
              <table className="aos-table aos-beds__table admin-table--stack">
                <thead>
                  <tr>
                    <th>Bed</th>
                    <th>Type</th>
                    <th>Ward</th>
                    <th>Status</th>
                    <th>Patient</th>
                    <th className="aos-beds__th-actions">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {beds.map((bed) => {
                    const occupiedBed = String(bed.status).toLowerCase() === 'occupied';
                    const inactiveBed = bed.is_active === false;
                    const hadPatient = bedHadPatient(bed);
                    const isEditing = editingId === bed.id;
                    return (
                      <tr
                        key={bed.id}
                        className={
                          inactiveBed
                            ? 'aos-beds__row--inactive'
                            : occupiedBed
                              ? 'aos-beds__row--occupied'
                              : 'aos-beds__row--available'
                        }
                      >
                        <td data-label="Bed">
                          {isEditing ? (
                            <Input
                              value={editForm.bed_number}
                              onChange={(e) =>
                                setEditForm((p) => ({ ...p, bed_number: e.target.value }))
                              }
                            />
                          ) : (
                            <span className="aos-beds__bed-id">{bed.bed_number}</span>
                          )}
                        </td>
                        <td data-label="Type">
                          {isEditing ? (
                            <select
                              className="aos-select aos-select--sm"
                              value={editForm.bed_type}
                              onChange={(e) =>
                                setEditForm((p) => ({ ...p, bed_type: e.target.value }))
                              }
                              aria-label="Bed type"
                            >
                              <option value="single">Single</option>
                              <option value="double">Double</option>
                            </select>
                          ) : (
                            <span
                              className={`aos-beds__type aos-beds__type--${
                                bed.bed_type === 'double' ? 'double' : 'single'
                              }`}
                            >
                              {bed.bed_type === 'double' ? 'Double' : 'Single'}
                            </span>
                          )}
                        </td>
                        <td data-label="Ward">
                          {isEditing ? (
                            <select
                              className="aos-select aos-select--sm"
                              value={editForm.ward_name}
                              onChange={(e) =>
                                setEditForm((p) => ({ ...p, ward_name: e.target.value }))
                              }
                            >
                              {!wardOptions.includes(editForm.ward_name) && editForm.ward_name ? (
                                <option value={editForm.ward_name}>{editForm.ward_name}</option>
                              ) : null}
                              {wardOptions.map((w) => (
                                <option key={w} value={w}>
                                  {w}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span className="aos-beds__ward">{bed.ward_name}</span>
                          )}
                        </td>
                        <td data-label="Status">
                          <span
                            className={`aos-beds__status aos-beds__status--${
                              inactiveBed
                                ? 'inactive'
                                : occupiedBed
                                  ? 'occupied'
                                  : 'available'
                            }`}
                          >
                            <span className="aos-beds__status-dot" aria-hidden />
                            {inactiveBed ? 'Inactive' : occupiedBed ? 'Occupied' : 'Available'}
                          </span>
                        </td>
                        <td className="aos-beds__patient" data-label="Patient">
                          {bed.patient_name || bed.patient_uid || (
                            <span className="aos-table__muted">—</span>
                          )}
                        </td>
                        <td className="aos-beds__td-actions" data-label="Actions">
                          {!canEditAllBeds ? (
                            <span className="aos-table__muted">—</span>
                          ) : isEditing ? (
                            <div className="aos-beds__actions">
                              <Button
                                type="button"
                                size="sm"
                                disabled={busy}
                                onClick={() => saveEdit(bed.id)}
                              >
                                Save
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={cancelEdit}
                              >
                                Cancel
                              </Button>
                            </div>
                          ) : inactiveBed ? (
                            <div className="aos-beds__actions">
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="aos-beds__icon-btn aos-beds__icon-btn--activate"
                                disabled={busy}
                                title="Activate bed"
                                onClick={() => setPendingBedActivate(bed)}
                              >
                                <CheckCircle2 size={14} />
                                <span>Activate</span>
                              </Button>
                            </div>
                          ) : (
                            <div className="aos-beds__actions">
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="aos-beds__icon-btn"
                                disabled={occupiedBed || busy}
                                title={
                                  occupiedBed
                                    ? 'Release patient before editing'
                                    : 'Edit bed'
                                }
                                onClick={() => startEdit(bed)}
                              >
                                <Pencil size={14} />
                                <span>Edit</span>
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className={`aos-beds__icon-btn${
                                  hadPatient ? '' : ' aos-beds__icon-btn--danger'
                                }`}
                                disabled={occupiedBed || busy}
                                title={
                                  occupiedBed
                                    ? 'Release the patient before deactivating this bed'
                                    : hadPatient
                                      ? 'Deactivate bed. Patient history is kept.'
                                      : 'Delete bed. This bed has never had a patient.'
                                }
                                onClick={() => handleDelete(bed)}
                              >
                                {hadPatient ? <Ban size={14} /> : <Trash2 size={14} />}
                                <span>{hadPatient ? 'Deactivate' : 'Delete'}</span>
                              </Button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </QueryFeedback>
      </SectionCard>
    </div>
  );
}

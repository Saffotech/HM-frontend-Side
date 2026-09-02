import { useEffect, useMemo, useState } from 'react';
import {
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
  useBedInventoryListQuery,
  useBedInventorySummaryQuery,
  useCreateInventoryBedMutation,
  useCreateInventoryBedsBulkMutation,
  useDeleteInventoryBedMutation,
  useDeleteInventoryWardMutation,
  useUpdateInventoryBedMutation,
} from '@/features/admin/hooks/useOpdBedsQuery';
import { Button, Input, QueryFeedback } from '@/shared/components/common';
import { toast } from '@/shared/utils/toast';
import { setBedTypesInOverlay } from '@/shared/utils/bedTypeOverlay';

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
              Locked by Super Admin — you can view these settings but cannot change them.
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

function buildBulkIds(form) {
  const start = Number(form.start_number) || 0;
  const count = Math.min(Math.max(Number(form.count) || 0, 0), 100);
  const pad = Number(form.pad_width) || 0;
  const prefix = form.prefix ?? '';
  if (!count) return [];
  return Array.from({ length: count }, (_, i) => formatBedId(prefix, start + i, pad));
}

export default function AdminOpdBedsSection({
  manageAdminEditLocks = false,
  canEditBedInventory = true,
  canEditWards = true,
  canEditAllBeds = true,
  lockToggle = () => null,
  adminEditSaving = false,
}) {
  const [wardFilter, setWardFilter] = useState('all');
  const [bedTypeFilter, setBedTypeFilter] = useState('all');
  const [addMode, setAddMode] = useState('single'); // single | bulk | ward
  const [wardName, setWardName] = useState('');
  const [customWards, setCustomWards] = useState([]);
  const [newWardName, setNewWardName] = useState('');
  const [newWardPrefix, setNewWardPrefix] = useState('');
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
  // Always load full inventory so duplicate checks & next-number work with ward filter on.
  const listQ = useBedInventoryListQuery({});
  const createMut = useCreateInventoryBedMutation();
  const bulkMut = useCreateInventoryBedsBulkMutation();
  const updateMut = useUpdateInventoryBedMutation();
  const deleteMut = useDeleteInventoryBedMutation();
  const deleteWardMut = useDeleteInventoryWardMutation();

  const allBeds = listQ.data?.beds ?? [];
  const beds = allBeds.filter((b) => {
    if (wardFilter !== 'all' && b.ward_name !== wardFilter) return false;
    const type = b.bed_type === 'double' ? 'double' : 'single';
    if (bedTypeFilter !== 'all' && type !== bedTypeFilter) return false;
    return true;
  });

  const stats = listQ.data?.stats ?? summaryQ.data?.totals ?? {};
  const total = Number(stats.total ?? stats.beds ?? 0);
  const available = Number(stats.available ?? 0);
  const occupied = Number(stats.occupied ?? 0);
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
    deleteWardMut.isPending;

  const wardRows = useMemo(() => {
    const byName = new Map();
    for (const bed of allBeds) {
      const name = bed.ward_name;
      if (!name) continue;
      if (!byName.has(name)) {
        byName.set(name, { ward_name: name, total: 0, available: 0, occupied: 0 });
      }
      const row = byName.get(name);
      row.total += 1;
      if (String(bed.status).toLowerCase() === 'occupied') row.occupied += 1;
      else row.available += 1;
    }
    for (const name of customWards) {
      if (!byName.has(name)) {
        byName.set(name, { ward_name: name, total: 0, available: 0, occupied: 0 });
      }
    }
    return [...byName.values()].sort((a, b) => a.ward_name.localeCompare(b.ward_name));
  }, [allBeds, customWards]);

  const handleDeleteWard = async (ward) => {
    if (!canEditWards) return;
    const occupiedCount = Number(ward.occupied ?? 0);
    if (occupiedCount > 0) {
      toast.error(
        `Cannot delete "${ward.ward_name}" — ${occupiedCount} bed(s) still occupied. Release patients first.`
      );
      return;
    }
    const bedCount = Number(ward.total ?? 0);
    const msg =
      bedCount > 0
        ? `Delete ward "${ward.ward_name}" and its ${bedCount} bed(s)? This cannot be undone.`
        : `Remove ward "${ward.ward_name}"?`;
    if (!window.confirm(msg)) return;

    if (bedCount === 0) {
      setCustomWards((prev) => prev.filter((w) => w !== ward.ward_name));
      if (wardName === ward.ward_name) setWardName('');
      if (wardFilter === ward.ward_name) setWardFilter('all');
      toast.success(`Ward "${ward.ward_name}" removed`);
      return;
    }

    try {
      const result = await deleteWardMut.mutateAsync(ward.ward_name);
      setCustomWards((prev) => prev.filter((w) => w !== ward.ward_name));
      if (wardName === ward.ward_name) setWardName('');
      if (wardFilter === ward.ward_name) setWardFilter('all');
      toast.success(
        `Ward "${ward.ward_name}" deleted (${result?.deleted_beds ?? bedCount} beds removed)`
      );
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
    const prefix = (newWardPrefix.trim() || defaultPrefixForWard(name));
    setBulkForm((p) => ({ ...p, prefix }));
    setNewWardName('');
    setNewWardPrefix('');
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
        const result = await createMut.mutateAsync({
          ward_name: wardName.trim(),
          bed_number: bedNumber,
          bed_type: bedType,
        });
        if (result?.id) setBedTypesInOverlay({ id: result.id, bed_type: bedType });
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
      setBedTypesInOverlay(
        (result?.beds ?? []).map((b) => ({ id: b.id, bed_type: bedType })),
      );
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
      setBedTypesInOverlay({
        id: bedId,
        bed_type: editForm.bed_type === 'double' ? 'double' : 'single',
      });
      toast.success('Bed updated');
      cancelEdit();
    } catch (err) {
      toast.error(err?.message || 'Failed to update bed');
    }
  };

  const handleDelete = async (bed) => {
    if (!canEditAllBeds) return;
    if (String(bed.status).toLowerCase() === 'occupied') {
      toast.error('Release the patient before deleting this bed');
      return;
    }
    if (!window.confirm(`Delete bed ${bed.bed_number} from ${bed.ward_name}?`)) return;
    try {
      await deleteMut.mutateAsync(bed.id);
      toast.success(`Bed ${bed.bed_number} deleted`);
      if (editingId === bed.id) cancelEdit();
      setStartTouched(false);
      setSingleTouched(false);
    } catch (err) {
      toast.error(err?.message || 'Failed to delete bed');
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
            <label className="aos-beds__compact-field aos-beds__compact-field--sm">
              <span>Prefix</span>
              <Input
                value={newWardPrefix}
                onChange={(e) => setNewWardPrefix(e.target.value)}
                placeholder="auto"
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
                <label className="aos-beds__compact-field aos-beds__compact-field--sm">
                  <span>Prefix</span>
                  <Input
                    value={bulkForm.prefix}
                    onChange={(e) => {
                      setStartTouched(false);
                      setBulkForm((p) => ({ ...p, prefix: e.target.value }));
                    }}
                    placeholder="G-"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAdd(e);
                      }
                    }}
                  />
                </label>
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
        action={lockToggle('wards')}
      >
        <p className="aos-card__hint">
          Delete a ward to remove it and all its empty beds. Occupied beds must be released first.
        </p>
        {wardRows.length === 0 ? (
          <p className="aos-beds__ward-empty">No wards yet. Use <strong>New ward</strong> above.</p>
        ) : (
          <ul className="aos-beds__ward-list">
            {wardRows.map((ward) => {
              const blocked = Number(ward.occupied ?? 0) > 0;
              return (
                <li key={ward.ward_name} className="aos-beds__ward-row">
                  <div className="aos-beds__ward-meta">
                    <strong>{ward.ward_name}</strong>
                    <span>
                      {ward.total} bed{ward.total === 1 ? '' : 's'}
                      {ward.occupied > 0 ? ` · ${ward.occupied} occupied` : ''}
                    </span>
                  </div>
                  {canEditWards ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="aos-beds__icon-btn aos-beds__icon-btn--danger"
                      disabled={busy || blocked}
                      title={
                        blocked
                          ? 'Release occupied beds before deleting this ward'
                          : `Delete ward ${ward.ward_name}`
                      }
                      onClick={() => handleDeleteWard(ward)}
                    >
                      <Trash2 size={14} />
                      <span>Delete ward</span>
                    </Button>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </SectionCard>

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
              <strong>No beds yet</strong>
              <p>Add a ward or beds above to start your inventory.</p>
            </div>
          ) : (
            <div className="aos-table-wrap aos-beds__table-wrap">
              <table className="aos-table aos-beds__table">
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
                    const isEditing = editingId === bed.id;
                    return (
                      <tr
                        key={bed.id}
                        className={
                          occupiedBed ? 'aos-beds__row--occupied' : 'aos-beds__row--available'
                        }
                      >
                        <td>
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
                        <td>
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
                        <td>
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
                        <td>
                          <span
                            className={`aos-beds__status aos-beds__status--${
                              occupiedBed ? 'occupied' : 'available'
                            }`}
                          >
                            <span className="aos-beds__status-dot" aria-hidden />
                            {occupiedBed ? 'Occupied' : 'Available'}
                          </span>
                        </td>
                        <td className="aos-beds__patient">
                          {bed.patient_name || bed.patient_uid || (
                            <span className="aos-table__muted">—</span>
                          )}
                        </td>
                        <td className="aos-beds__td-actions">
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
                                className="aos-beds__icon-btn aos-beds__icon-btn--danger"
                                disabled={occupiedBed || busy}
                                title={
                                  occupiedBed
                                    ? 'Release patient before deleting'
                                    : 'Delete bed'
                                }
                                onClick={() => handleDelete(bed)}
                              >
                                <Trash2 size={14} />
                                <span>Delete</span>
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

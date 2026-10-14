import { useMemo, useState } from 'react';
import { ListChecks, Plus } from 'lucide-react';
import {
  useActivateAdminLabCatalogMutation,
  useAdminLabCatalogQuery,
  useCreateAdminLabCatalogMutation,
  useUpdateAdminLabCatalogMutation,
} from '@/features/admin/lab/hooks/useAdminLabCatalogQuery';
import { useLabRoutingDepartmentsQuery } from '@/shared/hooks/queries/useOpdReferenceQuery';
import {
  departmentCode,
  labDepartmentLabel,
} from '@/shared/utils/labDepartments';
import { formatCatalogPrice } from '@/shared/api/mappers/labCatalogMapper';
import {
  formatCurrency,
  getCurrencySymbol,
} from '@/shared/utils/formatCurrency';
import { Button, Input, QueryFeedback, Select } from '@/shared/components/common';
import { toast } from '@/shared/utils/toast';

const EMPTY_DRAFT = {
  testName: '',
  departmentId: '',
  price: '',
};

function toPricePayload(raw) {
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return null;
  return String(Math.round(n));
}

function displayPriceValue(raw) {
  if (raw == null || raw === '') return '';
  const n = Number(raw);
  if (!Number.isFinite(n)) return String(raw);
  return String(Math.round(n));
}

function departmentOptions(depts) {
  return (depts ?? []).map((d) => ({
    value: String(d.id),
    label: d.name || labDepartmentLabel(d) || departmentCode(d) || `Dept ${d.id}`,
  }));
}

function deptLabel(depts, departmentId) {
  const found = (depts ?? []).find((d) => Number(d.id) === Number(departmentId));
  if (!found) return departmentId != null ? `Dept ${departmentId}` : '—';
  return found.name || labDepartmentLabel(found) || departmentCode(found) || `Dept ${departmentId}`;
}

/**
 * Admin Lab Catalog CRUD — current catalog config only.
 * Does not affect historical order prices (lab_test_orders.price).
 */
export default function AdminLabCatalogSection({ locked = false }) {
  const [statusFilter, setStatusFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ testName: '', price: '', departmentId: '' });

  const catalogQuery = useAdminLabCatalogQuery({}, { enabled: true });
  const deptsQuery = useLabRoutingDepartmentsQuery({ enabled: true });
  const createMut = useCreateAdminLabCatalogMutation();
  const updateMut = useUpdateAdminLabCatalogMutation();
  const activateMut = useActivateAdminLabCatalogMutation();

  const tests = catalogQuery.data ?? [];
  const depts = deptsQuery.data ?? [];
  const deptOpts = useMemo(() => departmentOptions(depts), [depts]);

  const filtered = useMemo(() => {
    const q = String(search ?? '').trim().toLowerCase();
    return tests.filter((t) => {
      if (statusFilter === 'active' && !t.active) return false;
      if (statusFilter === 'inactive' && t.active) return false;
      if (
        departmentFilter !== 'all'
        && Number(t.departmentId) !== Number(departmentFilter)
      ) {
        return false;
      }
      if (q && !String(t.testName ?? '').toLowerCase().includes(q)) return false;
      return true;
    });
  }, [tests, statusFilter, departmentFilter, search]);

  const busy =
    createMut.isPending || updateMut.isPending || activateMut.isPending;

  const handleCreate = async () => {
    if (locked) return;
    const testName = String(draft.testName ?? '').trim();
    const departmentId = Number(draft.departmentId);
    const price = toPricePayload(draft.price);
    if (!testName) {
      toast.error('Test name is required');
      return;
    }
    if (!Number.isFinite(departmentId) || departmentId <= 0) {
      toast.error('Select Laboratory or Radiology department');
      return;
    }
    if (price == null) {
      toast.error('Enter a valid price (0 or more)');
      return;
    }
    try {
      await createMut.mutateAsync({
        test_name: testName,
        department_id: departmentId,
        price,
      });
      setDraft(EMPTY_DRAFT);
      toast.success('Catalog test added');
    } catch {
      /* toast from mutation */
    }
  };

  const startEdit = (row) => {
    if (locked) return;
    setEditingId(row.id);
    setEditForm({
      testName: row.testName ?? '',
      price: displayPriceValue(row.price),
      departmentId: row.departmentId != null ? String(row.departmentId) : '',
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({ testName: '', price: '', departmentId: '' });
  };

  const saveEdit = async (row) => {
    if (locked) return;
    const testName = String(editForm.testName ?? '').trim();
    const price = toPricePayload(editForm.price);
    const departmentId = Number(editForm.departmentId);
    if (!testName) {
      toast.error('Test name is required');
      return;
    }
    if (price == null) {
      toast.error('Enter a valid price (0 or more)');
      return;
    }
    if (!Number.isFinite(departmentId) || departmentId <= 0) {
      toast.error('Select a department');
      return;
    }

    const payload = {};
    if (testName !== row.testName) payload.test_name = testName;
    if (String(price) !== String(toPricePayload(row.price) ?? row.price)) {
      payload.price = price;
    }
    if (Number(departmentId) !== Number(row.departmentId)) {
      payload.department_id = departmentId;
    }
    if (Object.keys(payload).length === 0) {
      cancelEdit();
      return;
    }

    try {
      await updateMut.mutateAsync({ testId: row.id, payload });
      toast.success('Catalog test updated');
      cancelEdit();
    } catch {
      /* toast from mutation */
    }
  };

  const toggleActive = async (row) => {
    if (locked) return;
    try {
      await activateMut.mutateAsync({ testId: row.id, active: !row.active });
      toast.success(row.active ? 'Test deactivated' : 'Test activated');
    } catch {
      /* toast from mutation */
    }
  };

  return (
    <div className="aos-lab-catalog">
      <QueryFeedback
        isLoading={catalogQuery.isLoading || deptsQuery.isLoading}
        isError={catalogQuery.isError || deptsQuery.isError}
        error={catalogQuery.error || deptsQuery.error}
        onRetry={() => {
          catalogQuery.refetch();
          deptsQuery.refetch();
        }}
      >
        <div className="aos-lab-catalog__toolbar">
          <div className="aos-lab-catalog__filters">
            <label className="aos-lab-catalog__filter" htmlFor="lab_catalog_status">
              <span>Status</span>
              <select
                id="lab_catalog_status"
                className="aos-select aos-select--sm"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All tests</option>
                <option value="active">Active only</option>
                <option value="inactive">Inactive only</option>
              </select>
            </label>

            <label className="aos-lab-catalog__filter" htmlFor="lab_catalog_dept">
              <span>Department</span>
              <select
                id="lab_catalog_dept"
                className="aos-select aos-select--sm"
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
              >
                <option value="all">All departments</option>
                {deptOpts.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="aos-lab-catalog__filter aos-lab-catalog__filter--search" htmlFor="lab_catalog_search">
              <span>Search</span>
              <input
                id="lab_catalog_search"
                className="aos-select aos-select--sm aos-lab-catalog__search"
                type="search"
                value={search}
                placeholder="Test name…"
                onChange={(e) => setSearch(e.target.value)}
              />
            </label>
          </div>
          <span className="aos-lab-catalog__count">{filtered.length} tests</span>
        </div>

        <div className="aos-lab-catalog__table" role="table" aria-label="Lab test catalog">
          <div className="aos-lab-catalog__head" role="row">
            <span role="columnheader">Test name</span>
            <span role="columnheader">Department</span>
            <span role="columnheader">Price</span>
            <span role="columnheader">Status</span>
            <span role="columnheader">Actions</span>
          </div>

          {!locked ? (
            <div className="aos-lab-catalog__row aos-lab-catalog__row--create" role="row">
              <div className="aos-lab-catalog__cell" role="cell">
                <Input
                  value={draft.testName}
                  placeholder="e.g. CBC"
                  disabled={busy}
                  onChange={(e) =>
                    setDraft((prev) => ({ ...prev, testName: e.target.value }))
                  }
                />
              </div>
              <div className="aos-lab-catalog__cell" role="cell">
                <Select
                  value={draft.departmentId}
                  disabled={busy || deptOpts.length === 0}
                  placeholder="Select department"
                  options={deptOpts}
                  onChange={(value) =>
                    setDraft((prev) => ({ ...prev, departmentId: value }))
                  }
                />
              </div>
              <div className="aos-lab-catalog__cell aos-lab-catalog__cell--price" role="cell">
                <div className="aos-lab-catalog__price">
                  <span aria-hidden>{getCurrencySymbol()}</span>
                  <Input
                    type="number"
                    min={0}
                    step="1"
                    value={draft.price}
                    placeholder="0"
                    disabled={busy}
                    onChange={(e) =>
                      setDraft((prev) => ({ ...prev, price: e.target.value }))
                    }
                  />
                </div>
              </div>
              <div className="aos-lab-catalog__cell aos-lab-catalog__cell--muted" role="cell">
                New
              </div>
              <div className="aos-lab-catalog__cell aos-lab-catalog__cell--actions" role="cell">
                <Button type="button" size="sm" disabled={busy} onClick={handleCreate}>
                  <Plus size={14} /> Add
                </Button>
              </div>
            </div>
          ) : null}

          {filtered.length === 0 ? (
            <div className="aos-lab-catalog__empty">
              <ListChecks size={16} aria-hidden />
              No catalog tests yet. Add tests above for doctors to select when ordering.
            </div>
          ) : (
            filtered.map((row) => {
              const isEditing = editingId === row.id;
              return (
                <div
                  key={row.id}
                  className={`aos-lab-catalog__row${!row.active ? ' is-inactive' : ''}${
                    isEditing ? ' is-editing' : ''
                  }`}
                  role="row"
                >
                  {isEditing ? (
                    <>
                      <div className="aos-lab-catalog__cell" role="cell">
                        <Input
                          value={editForm.testName}
                          disabled={busy}
                          onChange={(e) =>
                            setEditForm((prev) => ({ ...prev, testName: e.target.value }))
                          }
                        />
                      </div>
                      <div className="aos-lab-catalog__cell" role="cell">
                        <Select
                          value={editForm.departmentId}
                          disabled={busy}
                          options={deptOpts}
                          onChange={(value) =>
                            setEditForm((prev) => ({ ...prev, departmentId: value }))
                          }
                        />
                      </div>
                      <div className="aos-lab-catalog__cell aos-lab-catalog__cell--price" role="cell">
                        <div className="aos-lab-catalog__price">
                          <span aria-hidden>{getCurrencySymbol()}</span>
                          <Input
                            type="number"
                            min={0}
                            step="1"
                            value={editForm.price}
                            disabled={busy}
                            onChange={(e) =>
                              setEditForm((prev) => ({ ...prev, price: e.target.value }))
                            }
                          />
                        </div>
                      </div>
                      <div className="aos-lab-catalog__cell" role="cell">
                        <span className="aos-lab-catalog__badge aos-lab-catalog__badge--edit">
                          Editing
                        </span>
                      </div>
                      <div className="aos-lab-catalog__cell aos-lab-catalog__cell--actions" role="cell">
                        <Button
                          type="button"
                          size="sm"
                          disabled={busy}
                          onClick={() => saveEdit(row)}
                        >
                          Save
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={busy}
                          onClick={cancelEdit}
                        >
                          Cancel
                        </Button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="aos-lab-catalog__cell" role="cell">
                        <strong className="aos-lab-catalog__name">{row.testName}</strong>
                      </div>
                      <div className="aos-lab-catalog__cell" role="cell">
                        <span className="aos-lab-catalog__dept">
                          {deptLabel(depts, row.departmentId)}
                        </span>
                      </div>
                      <div className="aos-lab-catalog__cell aos-lab-catalog__cell--price" role="cell">
                        <span className="aos-lab-catalog__amount">
                          {formatCurrency(row.price, { empty: '—' })}
                        </span>
                      </div>
                      <div className="aos-lab-catalog__cell" role="cell">
                        <label className="aos-lab-catalog__toggle">
                          <input
                            type="checkbox"
                            checked={Boolean(row.active)}
                            disabled={locked || busy}
                            onChange={() => toggleActive(row)}
                            aria-label={`Active ${row.testName}`}
                          />
                          <span>{row.active ? 'On' : 'Off'}</span>
                        </label>
                      </div>
                      <div className="aos-lab-catalog__cell aos-lab-catalog__cell--actions" role="cell">
                        {!locked ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={busy}
                            onClick={() => startEdit(row)}
                          >
                            Edit
                          </Button>
                        ) : (
                          <span className="aos-lab-catalog__cell--muted">—</span>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })
          )}
        </div>
      </QueryFeedback>
    </div>
  );
}

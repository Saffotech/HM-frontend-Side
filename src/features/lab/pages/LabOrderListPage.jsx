import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import LabLayout from '@/features/lab/components/LabLayout';
import { useLabPermissionSet } from '@/features/lab/hooks/useLabPermission';
import { useLabTechnicianProfileQuery } from '@/features/lab/hooks/useLabTechnicianProfileQuery';
import { useLabOrdersQuery } from '@/shared/hooks/queries/useLabQuery';
import { useAuth } from '@/shared/hooks/useAuth';
import {
  LAB_STATUS_META,
  LAB_ORDER_STATUS,
  statusLabel,
  uploadActionLabel,
  statusBadgeClass,
} from '@/features/lab/utils/labOrderStatus';
import {
  departmentCode,
  isLabOrRadCode,
  labDepartmentLabelFromUser,
  labOrderCategoryOptionsForDept,
  isOrderForLabDept,
  isApiLabOrderCategory,
  orderMatchesCategoryFilter,
  LAB_DEPT_CODE,
} from '@/shared/utils/labDepartments';
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue';
import { EmptyState, QueryFeedback } from '@/shared/components/common';
import { ROUTES } from '@/shared/constants';
import { DateInput } from '@/shared/components/common';
import { ClipboardList } from 'lucide-react';
import LabEncounterBadge from '@/features/lab/components/LabEncounterBadge';
import { visitLocationLabel, normalizeEncounterType } from '@/features/lab/utils/visitLocation';
import '../styles/lab.css';

const labUploadPath = (id) => `/lab/orders/${id}/upload`;

const VIEW_TABS = [
  { id: 'all', label: 'All', hint: 'Every request' },
  { id: 'ordered', label: 'Waiting', hint: 'Ordered — not started' },
  { id: 'completed', label: 'Completed', hint: 'Test completed' },
];

const LEGACY_VIEW_MAP = {
  sample_collected: 'ordered',
  processing: 'ordered',
};

function resolveTechDeptCode(user, profileData) {
  const profile = profileData?.profile ?? profileData;
  const label = labDepartmentLabelFromUser(profile) || labDepartmentLabelFromUser(user);
  if (label === 'Radiology') return LAB_DEPT_CODE.RAD;
  if (label === 'Laboratory') return LAB_DEPT_CODE.LAB;

  const sources = [profile, profile?.department, user, user?.department];
  for (const src of sources) {
    const code = departmentCode(src);
    if (isLabOrRadCode(code)) return code;
  }
  return '';
}

export default function LabOrderListPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const { canViewLab } = useLabPermissionSet();
  const profileQuery = useLabTechnicianProfileQuery({ enabled: canViewLab });

  const techDeptCode = useMemo(
    () => resolveTechDeptCode(user, profileQuery.data),
    [user, profileQuery.data],
  );

  const categoryOptions = useMemo(
    () => labOrderCategoryOptionsForDept(techDeptCode),
    [techDeptCode],
  );

  const initialView = searchParams.get('view') || searchParams.get('status') || 'ordered';
  const mappedView = LEGACY_VIEW_MAP[initialView] ?? initialView;
  const normalizedView = VIEW_TABS.some((t) => t.id === mappedView) ? mappedView : 'ordered';

  const [search, setSearch] = useState(searchParams.get('q') || '');
  const [view, setView] = useState(normalizedView);
  const [priority, setPriority] = useState(() => {
    const raw = searchParams.get('priority') || 'all';
    return raw === 'stat' ? 'all' : raw;
  });
  const [category, setCategory] = useState(searchParams.get('category') || 'all');
  const [date, setDate] = useState(searchParams.get('date') || '');
  const [filterSource, setFilterSource] = useState(() => {
    const raw = searchParams.get('source') || 'all';
    return raw === 'OPD' || raw === 'IPD' ? raw : 'all';
  });

  const debouncedSearch = useDebouncedValue(search, 300);

  // Drop category selections that don't belong to this lab department.
  useEffect(() => {
    if (category === 'all') return;
    if (!categoryOptions.includes(category)) {
      setCategory('all');
    }
  }, [category, categoryOptions]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (search) params.set('q', search);
    if (view !== 'ordered') params.set('view', view);
    if (priority !== 'all') params.set('priority', priority);
    if (category !== 'all') params.set('category', category);
    if (date) params.set('date', date);
    if (filterSource !== 'all') params.set('source', filterSource);
    setSearchParams(params, { replace: true });
  }, [search, view, priority, category, date, filterSource, setSearchParams]);

  const ordersQuery = useLabOrdersQuery(
    {
      view,
      search: debouncedSearch,
      priority,
      // Only send real API categories; test-name options are filtered client-side.
      category: category !== 'all' && isApiLabOrderCategory(category) ? category : 'all',
      date,
      pageSize: 100,
    },
    { enabled: canViewLab },
  );

  const orders = useMemo(() => {
    const rows = ordersQuery.data?.data ?? [];
    return rows.filter((order) => {
      if (isLabOrRadCode(techDeptCode) && !isOrderForLabDept(order, techDeptCode)) {
        return false;
      }
      return orderMatchesCategoryFilter(order, category);
    })
    .filter((order) => {
      if (filterSource === 'all') return true;
      return normalizeEncounterType(order.encounterType) === filterSource;
    });
  }, [ordersQuery.data?.data, techDeptCode, category, filterSource]);

  const total = orders.length;

  const hasExtraFilters = search || priority !== 'all' || category !== 'all' || date || filterSource !== 'all';

  const resetExtraFilters = () => {
    setSearch('');
    setPriority('all');
    setCategory('all');
    setDate('');
    setFilterSource('all');
  };

  const handleRowAction = (order) => {
    if (order.status === LAB_ORDER_STATUS.CANCELLED) return;
    if (order.status === LAB_ORDER_STATUS.COMPLETED) {
      navigate(ROUTES.LAB_REPORTS);
      return;
    }
    navigate(labUploadPath(order.id));
  };

  const activeTab = VIEW_TABS.find((t) => t.id === view) ?? VIEW_TABS[0];

  if (!canViewLab) {
    return (
      <LabLayout pageTitle="Pending Tests" compact>
        <EmptyState
          icon={ClipboardList}
          title="Lab access denied"
          description="You do not have permission to view lab orders."
        />
      </LabLayout>
    );
  }

  return (
    <LabLayout pageTitle="Pending Tests" compact>
      <div className="lab-orders-page">
      <div className="lab-card">
        <div className="lab-status-tabs">
          {VIEW_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`lab-status-tab${view === tab.id ? ' is-active' : ''}`}
              onClick={() => setView(tab.id)}
            >
              <span className="lab-status-tab__label">{tab.label}</span>
              <span className="lab-status-tab__hint">{tab.hint}</span>
            </button>
          ))}
        </div>

        <div className="lab-filters">
          <div className="lab-filter-group" style={{ flex: 2, minWidth: 200 }}>
            <label htmlFor="lab-orders-search">Search</label>
            <input
              id="lab-orders-search"
              type="search"
              className="search-input"
              placeholder="Patient, ID, test, doctor..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="lab-filter-group">
            <label htmlFor="lab-orders-source">Source</label>
            <select
              id="lab-orders-source"
              value={filterSource}
              onChange={(e) => setFilterSource(e.target.value)}
            >
              <option value="all">All</option>
              <option value="OPD">OPD</option>
              <option value="IPD">IPD</option>
            </select>
          </div>
          <div className="lab-filter-group">
            <label htmlFor="lab-orders-priority">Priority</label>
            <select id="lab-orders-priority" value={priority} onChange={(e) => setPriority(e.target.value)}>
              <option value="all">All</option>
              <option value="urgent">Urgent</option>
              <option value="normal">Normal</option>
            </select>
          </div>
          <div className="lab-filter-group">
            <label htmlFor="lab-orders-category">Category</label>
            <select id="lab-orders-category" value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="all">All</option>
              {categoryOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
          <div className="lab-filter-group">
            <DateInput
              id="lab-orders-date"
              label="Date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          {hasExtraFilters && (
            <button type="button" className="lab-filter-reset" onClick={resetExtraFilters}>
              ✕ Clear filters
            </button>
          )}
        </div>

        <QueryFeedback
          isLoading={ordersQuery.isLoading}
          isError={ordersQuery.isError}
          error={ordersQuery.error}
          onRetry={ordersQuery.refetch}
        >
          <div className="lab-result-count">
            <strong>{activeTab.label}</strong> — {total} test{total !== 1 ? 's' : ''}
          </div>

          {orders.length === 0 ? (
            <div className="lab-empty">
              <div className="lab-empty-icon">📋</div>
              <h3>No orders in this list</h3>
              <p>{activeTab.hint}</p>
            </div>
          ) : (
            <div className="lab-table-wrap">
              <table className="lab-table">
                <thead>
                  <tr>
                    <th>Request ID</th>
                    <th>Patient Name</th>
                    <th>Source</th>
                    <th>Ward</th>
                    <th>Bed</th>
                    <th>Doctor</th>
                    <th>Test</th>
                    <th>Priority</th>
                    <th>Requested</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o) => {
                    const location = visitLocationLabel(o);
                    return (
                    <tr key={o.id}>
                      <td>
                        <strong>{o.id}</strong>
                      </td>
                      <td className="lab-archive-patient">
                        <span className="lab-archive-patient__name">{o.patientName}</span>
                        <span className="lab-archive-meta lab-archive-patient__id">{o.patientId}</span>
                      </td>
                      <td>
                        <LabEncounterBadge encounterType={o.encounterType} />
                      </td>
                      <td className="lab-location-cell">{location.ward}</td>
                      <td className="lab-location-cell">{location.bed}</td>
                      <td>{o.doctorName}</td>
                      <td>{o.testName}</td>
                      <td>
                        <span className={`lab-badge ${o.priority}`}>
                          {o.priority === 'urgent' || o.priority === 'stat' ? '⚠ ' : ''}
                          {o.priorityLabel ?? o.priority}
                        </span>
                      </td>
                      <td style={{ color: '#6b7f99', whiteSpace: 'nowrap' }}>{o.requestedAt}</td>
                      <td>
                        <span
                          className={`lab-badge ${statusBadgeClass(o.status)}`}
                          title={LAB_STATUS_META[o.status]?.description}
                        >
                          {statusLabel(o.status)}
                        </span>
                      </td>
                      <td>
                        <button
                          type="button"
                          className={`lab-btn lab-btn-sm ${
                            o.status === LAB_ORDER_STATUS.COMPLETED || o.status === LAB_ORDER_STATUS.CANCELLED
                              ? 'lab-btn-secondary'
                              : 'lab-btn-primary'
                          }`}
                          disabled={o.status === LAB_ORDER_STATUS.CANCELLED}
                          title={
                            o.status === LAB_ORDER_STATUS.CANCELLED
                              ? 'This test was cancelled. Start / Upload is not available.'
                              : undefined
                          }
                          onClick={() => handleRowAction(o)}
                        >
                          {uploadActionLabel(o.status)}
                        </button>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </QueryFeedback>
      </div>
      </div>
    </LabLayout>
  );
}

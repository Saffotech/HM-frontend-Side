import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import LabLayout from '@/features/lab/components/LabLayout';
import { useLabOrdersQuery } from '@/shared/hooks/queries/useLabQuery';
import {
  LAB_STATUS_META,
  LAB_ORDER_STATUS,
  statusLabel,
  uploadActionLabel,
  statusBadgeClass,
} from '@/features/lab/utils/labOrderStatus';
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue';
import { QueryFeedback } from '@/shared/components/common';
import { ROUTES } from '@/shared/constants';
import { DateInput } from '@/shared/components/common';
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

export default function LabOrderListPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const initialView = searchParams.get('view') || searchParams.get('status') || 'ordered';
  const mappedView = LEGACY_VIEW_MAP[initialView] ?? initialView;
  const normalizedView = VIEW_TABS.some((t) => t.id === mappedView) ? mappedView : 'ordered';

  const [search, setSearch] = useState(searchParams.get('q') || '');
  const [view, setView] = useState(normalizedView);
  const [priority, setPriority] = useState(searchParams.get('priority') || 'all');
  const [category, setCategory] = useState(searchParams.get('category') || 'all');
  const [date, setDate] = useState(searchParams.get('date') || '');

  const debouncedSearch = useDebouncedValue(search, 300);

  useEffect(() => {
    const params = new URLSearchParams();
    if (search) params.set('q', search);
    if (view !== 'ordered') params.set('view', view);
    if (priority !== 'all') params.set('priority', priority);
    if (category !== 'all') params.set('category', category);
    if (date) params.set('date', date);
    setSearchParams(params, { replace: true });
  }, [search, view, priority, category, date, setSearchParams]);

  const ordersQuery = useLabOrdersQuery({
    view,
    search: debouncedSearch,
    priority,
    category,
    date,
    pageSize: 100,
  });

  const orders = ordersQuery.data?.data ?? [];
  const total = ordersQuery.data?.total ?? orders.length;

  const hasExtraFilters = search || priority !== 'all' || category !== 'all' || date;

  const resetExtraFilters = () => {
    setSearch('');
    setPriority('all');
    setCategory('all');
    setDate('');
  };

  const handleRowAction = (order) => {
    if (order.status === LAB_ORDER_STATUS.COMPLETED) {
      navigate(ROUTES.LAB_REPORTS);
      return;
    }
    navigate(labUploadPath(order.id));
  };

  const activeTab = VIEW_TABS.find((t) => t.id === view) ?? VIEW_TABS[0];

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
              <option value="Blood Test">Blood Test</option>
              <option value="Blood">Blood</option>
              <option value="Radiology">Radiology</option>
              <option value="Urine">Urine</option>
              <option value="Microbiology">Microbiology</option>
              <option value="Biochemistry">Biochemistry</option>
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
                    <th>Patient ID</th>
                    <th>Doctor</th>
                    <th>Test</th>
                    <th>Category</th>
                    <th>Priority</th>
                    <th>Requested</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o) => (
                    <tr key={o.id}>
                      <td>
                        <strong>{o.id}</strong>
                      </td>
                      <td>{o.patientName}</td>
                      <td style={{ fontFamily: 'monospace', fontSize: '12.5px', color: '#6b7f99' }}>{o.patientId}</td>
                      <td>{o.doctorName}</td>
                      <td>{o.testName}</td>
                      <td>
                        <span className={`lab-badge ${(o.category ?? '').toLowerCase()}`}>{o.category}</span>
                      </td>
                      <td>
                        <span className={`lab-badge ${o.priority}`}>
                          {o.priority === 'urgent' ? '⚠ ' : ''}
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
                          className={`lab-btn lab-btn-sm ${o.status === LAB_ORDER_STATUS.COMPLETED ? 'lab-btn-secondary' : 'lab-btn-primary'}`}
                          onClick={() => handleRowAction(o)}
                        >
                          {uploadActionLabel(o.status)}
                        </button>
                      </td>
                    </tr>
                  ))}
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

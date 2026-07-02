import { useMemo, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import LabLayout from '@/features/lab/components/LabLayout';
import { useLabOrders } from '@/features/lab/hooks/useLabStore';
import {
  LAB_STATUS_META,
  countByStatus,
  filterOrdersByView,
  statusLabel,
  uploadActionLabel,
} from '@/features/lab/utils/labOrderStatus';
import { ROUTES } from '@/shared/constants';
import { DateInput } from '@/shared/components/common';
import '../styles/lab.css';

const labUploadPath = (id) => `/lab/orders/${id}/upload`;

const VIEW_TABS = [
  { id: 'open', label: 'Open worklist', hint: 'Waiting + In Progress' },
  { id: 'pending', label: 'Waiting', hint: 'Not started' },
  { id: 'in_progress', label: 'In Progress', hint: 'Sample / test running' },
  { id: 'completed', label: 'Completed', hint: 'Report uploaded' },
  { id: 'all', label: 'All', hint: 'Every request' },
];

export default function LabOrderListPage() {
  const navigate = useNavigate();
  const { orders } = useLabOrders();
  const [searchParams, setSearchParams] = useSearchParams();

  const initialView = searchParams.get('view') || searchParams.get('status') || 'open';
  const normalizedView =
    initialView === 'pending' || initialView === 'in_progress' || initialView === 'completed'
      ? initialView
      : initialView === 'all'
        ? 'all'
        : 'open';

  const [search, setSearch] = useState(searchParams.get('q') || '');
  const [view, setView] = useState(normalizedView);
  const [priority, setPriority] = useState(searchParams.get('priority') || 'all');
  const [category, setCategory] = useState(searchParams.get('category') || 'all');
  const [date, setDate] = useState(searchParams.get('date') || '');

  useEffect(() => {
    const params = new URLSearchParams();
    if (search) params.set('q', search);
    if (view !== 'open') params.set('view', view);
    if (priority !== 'all') params.set('priority', priority);
    if (category !== 'all') params.set('category', category);
    if (date) params.set('date', date);
    setSearchParams(params, { replace: true });
  }, [search, view, priority, category, date, setSearchParams]);

  const counts = useMemo(() => countByStatus(orders), [orders]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = filterOrdersByView(orders, view);
    return list.filter((o) => {
      if (priority !== 'all' && o.priority !== priority) return false;
      if (category !== 'all' && o.category !== category) return false;
      if (date && o.requestedDate !== date) return false;
      if (!q) return true;
      return (
        o.patientName.toLowerCase().includes(q) ||
        o.patientId.toLowerCase().includes(q) ||
        o.id.toLowerCase().includes(q) ||
        o.testName.toLowerCase().includes(q) ||
        o.doctorName.toLowerCase().includes(q)
      );
    });
  }, [orders, view, search, priority, category, date]);

  const hasExtraFilters = search || priority !== 'all' || category !== 'all' || date;

  const resetExtraFilters = () => {
    setSearch('');
    setPriority('all');
    setCategory('all');
    setDate('');
  };

  const handleRowAction = (order) => {
    if (order.status === 'completed') {
      navigate(ROUTES.LAB_REPORTS);
      return;
    }
    navigate(labUploadPath(order.id));
  };

  const activeTab = VIEW_TABS.find((t) => t.id === view) ?? VIEW_TABS[0];

  return (
    <LabLayout pageTitle="Pending Tests">
      <div className="lab-page-header">
        <div className="lab-breadcrumb">
          <span>Lab Portal</span>
          <span className="sep">›</span>
          <span className="current">Pending Tests</span>
        </div>
        <h1>Test Request List</h1>
        <p>Track each test: Waiting → In Progress → Completed</p>
      </div>

      <div className="lab-status-flow">
        <div className="lab-status-flow__step is-done">
          <span>1</span>
          <div>
            <strong>Waiting</strong>
            <small>{LAB_STATUS_META.pending.description}</small>
          </div>
        </div>
        <div className="lab-status-flow__arrow">→</div>
        <div className="lab-status-flow__step is-current">
          <span>2</span>
          <div>
            <strong>In Progress</strong>
            <small>{LAB_STATUS_META.in_progress.description}</small>
          </div>
        </div>
        <div className="lab-status-flow__arrow">→</div>
        <div className="lab-status-flow__step">
          <span>3</span>
          <div>
            <strong>Completed</strong>
            <small>{LAB_STATUS_META.completed.description}</small>
          </div>
        </div>
      </div>

      <div className="lab-card">
        <div className="lab-status-tabs">
          {VIEW_TABS.map((tab) => {
            const count =
              tab.id === 'open'
                ? counts.open
                : tab.id === 'all'
                  ? counts.all
                  : counts[tab.id] ?? 0;
            return (
              <button
                key={tab.id}
                type="button"
                className={`lab-status-tab${view === tab.id ? ' is-active' : ''}`}
                onClick={() => setView(tab.id)}
              >
                <span className="lab-status-tab__label">{tab.label}</span>
                <span className="lab-status-tab__count">{count}</span>
                <span className="lab-status-tab__hint">{tab.hint}</span>
              </button>
            );
          })}
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
              <option value="Blood">Blood</option>
              <option value="Radiology">Radiology</option>
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

        <div className="lab-result-count">
          <strong>{activeTab.label}</strong> — {filtered.length} test{filtered.length !== 1 ? 's' : ''}
          {view === 'open' && (
            <span style={{ marginLeft: 8, color: '#6b7f99' }}>
              ({counts.pending} waiting, {counts.in_progress} in progress)
            </span>
          )}
        </div>

        {filtered.length === 0 ? (
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
                {filtered.map((o) => (
                  <tr key={o.id}>
                    <td>
                      <strong>{o.id}</strong>
                    </td>
                    <td>{o.patientName}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: '12.5px', color: '#6b7f99' }}>{o.patientId}</td>
                    <td>{o.doctorName}</td>
                    <td>{o.testName}</td>
                    <td>
                      <span className={`lab-badge ${o.category.toLowerCase()}`}>{o.category}</span>
                    </td>
                    <td>
                      <span className={`lab-badge ${o.priority}`}>
                        {o.priority === 'urgent' ? '⚠ ' : ''}
                        {o.priority}
                      </span>
                    </td>
                    <td style={{ color: '#6b7f99', whiteSpace: 'nowrap' }}>{o.requestedDate}</td>
                    <td>
                      <span className={`lab-badge ${o.status.replace('_', '-')}`} title={LAB_STATUS_META[o.status]?.description}>
                        {statusLabel(o.status)}
                      </span>
                    </td>
                    <td>
                      <button
                        type="button"
                        className={`lab-btn lab-btn-sm ${o.status === 'completed' ? 'lab-btn-secondary' : 'lab-btn-primary'}`}
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
      </div>
    </LabLayout>
  );
}

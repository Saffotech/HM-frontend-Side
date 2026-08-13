import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Clock3, FlaskConical } from 'lucide-react';
import {
  isOpenStatus,
  statusBadgeClass,
  statusLabel,
  uploadActionLabel,
} from '@/features/lab/utils/labOrderStatus';
import { ROUTES } from '@/shared/constants';

const PREVIEW_COUNT = 8;

const labUploadPath = (id) => `/lab/orders/${id}/upload`;

function pendingTestsPath(order) {
  const params = new URLSearchParams({ view: 'ordered' });
  const q = order?.patientName || order?.patientId || order?.id;
  if (q) params.set('q', String(q));
  return `${ROUTES.LAB_ORDERS}?${params.toString()}`;
}

function priorityClass(priority) {
  const key = String(priority || '').toLowerCase();
  if (key === 'urgent') return 'lab-dash-priority--urgent';
  if (key === 'stat') return 'lab-dash-priority--stat';
  return 'lab-dash-priority--normal';
}

function rowToneClass(priority) {
  const key = String(priority || '').toLowerCase();
  if (key === 'urgent' || key === 'stat') return 'lab-dash-remaining__row--urgent';
  return '';
}

function orderTimeMs(order) {
  if (order?.createdAt) {
    const t = new Date(order.createdAt).getTime();
    if (!Number.isNaN(t)) return t;
  }
  return 0;
}

/**
 * Dashboard list of open / remaining lab tests (not completed).
 * Row → Pending Tests; Start / Upload → upload page.
 */
export default function LabDashboardRemainingTests({ orders = [] }) {
  const navigate = useNavigate();
  const openOrders = [...orders]
    .filter((o) => isOpenStatus(o.status))
    .sort((a, b) => orderTimeMs(b) - orderTimeMs(a)); // newest first
  const remaining = openOrders.slice(0, PREVIEW_COUNT);
  const totalOpen = openOrders.length;

  return (
    <section className="lab-dash-reports lab-dash-remaining-panel" id="lab-remaining-tests">
      <div className="lab-dash-reports__head lab-dash-remaining-panel__head">
        <div className="lab-dash-remaining-panel__title-wrap">
          <span className="lab-dash-remaining-panel__icon" aria-hidden>
            <FlaskConical size={18} />
          </span>
          <div>
            <div className="lab-dash-remaining-panel__title-row">
              <h2>Remaining Tests</h2>
              {totalOpen > 0 ? (
                <span className="lab-dash-remaining-panel__count">{totalOpen}</span>
              ) : null}
            </div>
            <p>Newest requests first · open work still waiting</p>
          </div>
        </div>
        <Link to={`${ROUTES.LAB_ORDERS}?view=ordered`} className="lab-dash-ghost-btn">
          View worklist
          <ArrowRight size={14} aria-hidden />
        </Link>
      </div>

      {remaining.length === 0 ? (
        <div className="lab-dash-remaining-empty">
          <div className="lab-dash-remaining-empty__icon" aria-hidden>
            <FlaskConical size={26} />
          </div>
          <p className="lab-dash-remaining-empty__title">No remaining tests</p>
          <p className="lab-dash-remaining-empty__text">
            All open orders are clear. New requests will show up here.
          </p>
        </div>
      ) : (
        <ul className="lab-dash-remaining">
          {remaining.map((order, index) => (
            <li key={order.id} className="lab-dash-remaining__item">
              <div
                className={`lab-dash-remaining__row ${rowToneClass(order.priority)}`.trim()}
              >
                <button
                  type="button"
                  className="lab-dash-remaining__hit"
                  onClick={() => navigate(pendingTestsPath(order))}
                  aria-label={`Open pending tests for ${order.patientName || order.id}`}
                >
                  <span className="lab-dash-remaining__index" aria-hidden>
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <div className="lab-dash-remaining__main">
                    <span className="lab-dash-remaining__patient">{order.patientName}</span>
                    <span className="lab-dash-remaining__test">{order.testName}</span>
                    <span className="lab-dash-remaining__meta">
                      <Clock3 size={12} aria-hidden />
                      <span>
                        {order.patientId || '—'}
                        {order.requestedAt && order.requestedAt !== '—'
                          ? ` · ${order.requestedAt}`
                          : ''}
                      </span>
                    </span>
                  </div>
                  <div className="lab-dash-remaining__badges">
                    <span className={`lab-dash-priority ${priorityClass(order.priority)}`}>
                      {order.priorityLabel || order.priority || 'Normal'}
                    </span>
                    <span className={`lab-badge ${statusBadgeClass(order.status)}`}>
                      {statusLabel(order.status)}
                    </span>
                  </div>
                </button>
                <button
                  type="button"
                  className="lab-dash-remaining__action"
                  onClick={() => navigate(labUploadPath(order.id))}
                >
                  {uploadActionLabel(order.status)}
                  <ArrowRight size={14} aria-hidden />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

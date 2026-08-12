import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, FlaskConical } from 'lucide-react';
import {
  isOpenStatus,
  statusBadgeClass,
  statusLabel,
  uploadActionLabel,
} from '@/features/lab/utils/labOrderStatus';
import { ROUTES } from '@/shared/constants';

const PREVIEW_COUNT = 8;

const labUploadPath = (id) => `/lab/orders/${id}/upload`;

function priorityClass(priority) {
  const key = String(priority || '').toLowerCase();
  if (key === 'urgent') return 'lab-dash-priority--urgent';
  if (key === 'stat') return 'lab-dash-priority--stat';
  return 'lab-dash-priority--normal';
}

/**
 * Dashboard list of open / remaining lab tests (not completed).
 */
export default function LabDashboardRemainingTests({ orders = [] }) {
  const navigate = useNavigate();
  const remaining = orders.filter((o) => isOpenStatus(o.status)).slice(0, PREVIEW_COUNT);

  return (
    <section className="lab-dash-reports" id="lab-remaining-tests">
      <div className="lab-dash-reports__head">
        <div>
          <h2>Remaining Tests</h2>
          <p>Open work still waiting to be completed</p>
        </div>
        <Link to={`${ROUTES.LAB_ORDERS}?view=ordered`} className="lab-dash-ghost-btn">
          View worklist
          <ArrowRight size={14} aria-hidden />
        </Link>
      </div>

      {remaining.length === 0 ? (
        <div className="lab-dash-remaining-empty">
          <FlaskConical size={28} aria-hidden />
          <p className="lab-dash-remaining-empty__title">No remaining tests</p>
          <p className="lab-dash-remaining-empty__text">
            All open orders are clear. New requests will show up here.
          </p>
        </div>
      ) : (
        <ul className="lab-dash-remaining">
          {remaining.map((order) => (
            <li key={order.id} className="lab-dash-remaining__item">
              <button
                type="button"
                className="lab-dash-remaining__row"
                onClick={() => navigate(labUploadPath(order.id))}
              >
                <div className="lab-dash-remaining__main">
                  <span className="lab-dash-remaining__patient">{order.patientName}</span>
                  <span className="lab-dash-remaining__test">{order.testName}</span>
                  <span className="lab-dash-remaining__meta">
                    {order.patientId || '—'}
                    {order.requestedAt && order.requestedAt !== '—' ? ` · ${order.requestedAt}` : ''}
                  </span>
                </div>
                <div className="lab-dash-remaining__side">
                  <span className={`lab-dash-priority ${priorityClass(order.priority)}`}>
                    {order.priorityLabel || order.priority || 'Normal'}
                  </span>
                  <span className={`lab-badge ${statusBadgeClass(order.status)}`}>
                    {statusLabel(order.status)}
                  </span>
                  <span className="lab-dash-remaining__action">
                    {uploadActionLabel(order.status)}
                    <ArrowRight size={14} aria-hidden />
                  </span>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

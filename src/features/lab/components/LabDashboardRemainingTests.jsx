import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Clock3, FlaskConical } from 'lucide-react';
import {
  isOpenStatus,
  statusBadgeClass,
  statusLabel,
  uploadActionLabel,
} from '@/features/lab/utils/labOrderStatus';
import { ROUTES } from '@/shared/constants';
import { TablePagination } from '@/shared/components/common';
import LabEncounterBadge from '@/features/lab/components/LabEncounterBadge';
import { visitLocationSummary, normalizeEncounterType } from '@/features/lab/utils/visitLocation';

const PAGE_SIZE = 10;

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
  const [filterSource, setFilterSource] = useState('all');
  const [page, setPage] = useState(1);

  const worklistHref = useMemo(() => {
    const params = new URLSearchParams({ view: 'ordered' });
    if (filterSource !== 'all') params.set('source', filterSource);
    return `${ROUTES.LAB_ORDERS}?${params.toString()}`;
  }, [filterSource]);

  useEffect(() => {
    setPage(1);
  }, [filterSource]);

  const openOrders = useMemo(() => {
    const sourceFiltered =
      filterSource === 'all'
        ? orders
        : orders.filter((o) => normalizeEncounterType(o.encounterType) === filterSource);
    return [...sourceFiltered]
      .filter((o) => isOpenStatus(o.status))
      .sort((a, b) => orderTimeMs(b) - orderTimeMs(a));
  }, [orders, filterSource]);

  const totalOpen = openOrders.length;
  const pageCount = Math.max(1, Math.ceil(totalOpen / PAGE_SIZE) || 1);
  const safePage = Math.min(page, pageCount);
  const remaining = useMemo(
    () => openOrders.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
    [openOrders, safePage],
  );

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
        <div className="lab-dash-remaining-panel__actions">
          <label className="lab-dash-source-filter" htmlFor="lab-dash-source">
            <span className="lab-dash-source-filter__label">Source</span>
            <select
              id="lab-dash-source"
              className="lab-dash-source-filter__select"
              value={filterSource}
              onChange={(e) => setFilterSource(e.target.value)}
            >
              <option value="all">All</option>
              <option value="OPD">OPD</option>
              <option value="IPD">IPD</option>
            </select>
          </label>
          <Link to={worklistHref} className="lab-dash-ghost-btn">
            View worklist
            <ArrowRight size={14} aria-hidden />
          </Link>
        </div>
      </div>

      {remaining.length === 0 ? (
        <div className="lab-dash-remaining-empty">
          <div className="lab-dash-remaining-empty__icon" aria-hidden>
            <FlaskConical size={26} />
          </div>
          <p className="lab-dash-remaining-empty__title">No remaining tests</p>
          <p className="lab-dash-remaining-empty__text">
            {filterSource === 'all'
              ? 'All open orders are clear. New requests will show up here.'
              : `No open ${filterSource} tests right now.`}
          </p>
        </div>
      ) : (
        <>
          <ul className="lab-dash-remaining">
            {remaining.map((order, index) => {
              const rowNumber = (safePage - 1) * PAGE_SIZE + index + 1;
              return (
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
                      {String(rowNumber).padStart(2, '0')}
                    </span>
                    <div className="lab-dash-remaining__main">
                      <span className="lab-dash-remaining__patient">{order.patientName}</span>
                      <span className="lab-dash-remaining__test">{order.testName}</span>
                      <span className="lab-dash-remaining__visit">
                        <LabEncounterBadge encounterType={order.encounterType} />
                        {visitLocationSummary(order) ? (
                          <span className="lab-dash-remaining__visit-meta">{visitLocationSummary(order)}</span>
                        ) : null}
                      </span>
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
              );
            })}
          </ul>

          <TablePagination
            page={safePage}
            totalPages={pageCount}
            totalItems={totalOpen}
            pageSize={PAGE_SIZE}
            onPageChange={setPage}
            itemLabel="tests"
          />
        </>
      )}
    </section>
  );
}

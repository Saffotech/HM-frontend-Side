import { useMemo, useState } from 'react';
import { Search, X, Printer } from 'lucide-react';
import { printLabReport } from '@/features/lab/utils/labReportUtils';

/**
 * Dashboard-only live search — does not use the archive page.
 */
export default function LabDashboardReportFinder({ reports, onClose }) {
  const [query, setQuery] = useState('');
  const [pickedId, setPickedId] = useState(null);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return reports.filter(
      (r) =>
        r.patientName.toLowerCase().includes(q) ||
        r.reportId.toLowerCase().includes(q) ||
        r.patientId.toLowerCase().includes(q) ||
        r.testName.toLowerCase().includes(q) ||
        r.doctorName.toLowerCase().includes(q)
    );
  }, [reports, query]);

  const picked = pickedId ? reports.find((r) => r.reportId === pickedId) : null;

  return (
    <section className="lab-dash-finder">
      <div className="lab-dash-finder__head">
        <div>
          <h2>Find a Report</h2>
          <p>Search uploaded reports without leaving the dashboard</p>
        </div>
        <button type="button" className="lab-dash-finder__close" onClick={onClose} aria-label="Close finder">
          <X size={18} />
        </button>
      </div>

      <div className="lab-dash-finder__search">
        <Search size={18} aria-hidden />
        <input
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setPickedId(null);
          }}
          placeholder="Patient, report ID, test, or doctor..."
          autoFocus
        />
      </div>

      {query.trim() && results.length === 0 && (
        <p className="lab-dash-finder__empty">No report matches &ldquo;{query}&rdquo;</p>
      )}

      {results.length > 0 && (
        <ul className="lab-dash-finder__results">
          {results.map((r) => (
            <li key={r.reportId}>
              <button
                type="button"
                className={`lab-dash-finder__hit${pickedId === r.reportId ? ' is-picked' : ''}`}
                onClick={() => setPickedId(r.reportId)}
              >
                <strong>{r.reportId}</strong>
                <span>{r.patientName}</span>
                <span className="lab-dash-finder__muted">{r.testName}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {picked && (
        <div className="lab-dash-finder__detail">
          <h3>{picked.reportId}</h3>
          <p>
            <strong>{picked.patientName}</strong> ({picked.patientId}) — {picked.testName}
          </p>
          <p className="lab-dash-finder__muted">
            {picked.doctorName} · {picked.uploadedDate}
          </p>
          <button
            type="button"
            className="lab-dash-btn lab-dash-btn--primary lab-dash-btn--inline"
            onClick={() => printLabReport(picked)}
          >
            <Printer size={14} aria-hidden />
            Print report
          </button>
        </div>
      )}
    </section>
  );
}

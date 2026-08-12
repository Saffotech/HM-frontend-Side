import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, Printer } from 'lucide-react';
import { printLabReport } from '@/features/lab/utils/labReportUtils';
import { ROUTES } from '@/shared/constants';

const PREVIEW_COUNT = 4;

/**
 * Dashboard-only: expand rows in place to read & print.
 * "Show all" opens Report Archive.
 */
export default function LabDashboardRecentReports({ reports }) {
  const [expandedId, setExpandedId] = useState(null);

  const visible = reports.slice(0, PREVIEW_COUNT);

  const toggle = (id) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <section className="lab-dash-reports" id="lab-recent-reports">
      <div className="lab-dash-reports__head">
        <div>
          <h2>Recently Completed Reports</h2>
        </div>
        <Link to={ROUTES.LAB_REPORTS} className="lab-dash-ghost-btn">
          Show all
        </Link>
      </div>

      <ul className="lab-dash-accordion">
        {visible.map((r) => {
          const open = expandedId === r.reportId;
          return (
            <li key={r.reportId} className={`lab-dash-accordion__item${open ? ' is-open' : ''}`}>
              <button
                type="button"
                className="lab-dash-accordion__trigger"
                onClick={() => toggle(r.reportId)}
                aria-expanded={open}
              >
                <span className="lab-dash-report-id">{r.reportId}</span>
                <span className="lab-dash-accordion__patient">{r.patientName}</span>
                <span className="lab-dash-accordion__test">{r.testName}</span>
                <span className="lab-dash-accordion__time">{r.uploadedDate}</span>
                <ChevronDown size={16} className="lab-dash-accordion__chevron" aria-hidden />
              </button>
              {open && (
                <div className="lab-dash-accordion__body">
                  <dl className="lab-dash-accordion__meta">
                    <div>
                      <dt>Patient ID</dt>
                      <dd>{r.patientId}</dd>
                    </div>
                    <div>
                      <dt>Doctor</dt>
                      <dd>{r.doctorName}</dd>
                    </div>
                    <div>
                      <dt>Uploaded</dt>
                      <dd>{r.uploadedDate}</dd>
                    </div>
                  </dl>
                  <button
                    type="button"
                    className="lab-dash-btn lab-dash-btn--primary lab-dash-btn--inline"
                    onClick={() => printLabReport(r)}
                  >
                    <Printer size={14} aria-hidden />
                    Print this report
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

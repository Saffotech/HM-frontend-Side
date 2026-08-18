import { APP_NAME } from '@/shared/constants';
import { fetchLabReportById } from '@/shared/api/services/lab';
import { fetchLabReportFileBlob } from '@/features/lab/api/lab';
import { useAuthStore } from '@/shared/store/useAuthStore';
import { toast } from '@/shared/utils/toast';
import { visitLocationLabel } from '@/features/lab/utils/visitLocation';

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function displayValue(value, fallback = '—') {
  if (value == null || String(value).trim() === '') return fallback;
  return String(value);
}

function flagClass(flag) {
  const key = String(flag ?? '').toLowerCase();
  if (key === 'high') return 'flag-high';
  if (key === 'low') return 'flag-low';
  return 'flag-normal';
}

function buildParametersRows(parameters = []) {
  if (!parameters.length) {
    return `
      <tr>
        <td colspan="5" class="empty-params">No parameter results recorded for this report.</td>
      </tr>
    `;
  }

  return parameters
    .map((p) => {
      const name = escapeHtml(displayValue(p.parameter_name ?? p.name));
      const value = escapeHtml(displayValue(p.value));
      const unit = escapeHtml(displayValue(p.unit, ''));
      const range = escapeHtml(displayValue(p.normal_range ?? p.normalRange, ''));
      const flag = displayValue(p.flag, 'normal');
      return `
        <tr>
          <td>${name}</td>
          <td class="value-cell">${value}</td>
          <td>${unit || '—'}</td>
          <td>${range || '—'}</td>
          <td><span class="flag ${flagClass(flag)}">${escapeHtml(String(flag).toUpperCase())}</span></td>
        </tr>
      `;
    })
    .join('');
}

function resolvePreviewKind(fileType, fileName) {
  const mime = String(fileType ?? '').toLowerCase();
  const name = String(fileName ?? '').toLowerCase();

  if (mime.startsWith('image/')) return 'image';
  if (mime === 'application/pdf') return 'pdf';
  if (/\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(name)) return 'image';
  if (name.endsWith('.pdf')) return 'pdf';
  return 'other';
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error ?? new Error('Could not read uploaded file'));
    reader.readAsDataURL(blob);
  });
}

async function renderPdfPagesToDataUrls(blob) {
  const { getDocument, GlobalWorkerOptions } = await import('pdfjs-dist');
  const pdfjsWorker = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
  GlobalWorkerOptions.workerSrc = pdfjsWorker;

  const arrayBuffer = await blob.arrayBuffer();
  const pdf = await getDocument({ data: arrayBuffer }).promise;
  const pageImages = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum += 1) {
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale: 2 });
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    await page.render({ canvasContext: context, viewport }).promise;
    pageImages.push(canvas.toDataURL('image/jpeg', 0.92));
  }

  return pageImages;
}

function buildUploadedFileSection(report) {
  const previewKind = resolvePreviewKind(report.fileType, report.fileName);
  const fileName = escapeHtml(displayValue(report.fileName, 'Uploaded report file'));

  if (previewKind === 'other') return '';

  if (previewKind === 'image' && report.fileDataUrl) {
    return `
      <section class="uploaded-file-page uploaded-file-page--break">
        <div class="uploaded-file-header">
          <div class="uploaded-file-kicker">Uploaded Report File</div>
          <h2>${fileName}</h2>
        </div>
        <div class="uploaded-file-frame">
          <img src="${report.fileDataUrl}" alt="${fileName}" class="uploaded-image" />
        </div>
      </section>
    `;
  }

  if (previewKind === 'pdf' && report.pdfPageImages?.length) {
    const totalPages = report.pdfPageImages.length;
    return report.pdfPageImages
      .map((pageDataUrl, index) => {
        const pageLabel = totalPages > 1 ? ` · Page ${index + 1} of ${totalPages}` : '';
        return `
          <section class="uploaded-file-page uploaded-pdf-page">
            <div class="uploaded-file-header">
              <div class="uploaded-file-kicker">Uploaded Report File${pageLabel}</div>
              <h2>${fileName}</h2>
            </div>
            <div class="uploaded-file-frame uploaded-pdf-page-frame">
              <img
                src="${pageDataUrl}"
                alt="${fileName} page ${index + 1}"
                class="uploaded-image uploaded-pdf-page-image"
              />
            </div>
          </section>
        `;
      })
      .join('');
  }

  if (previewKind === 'pdf' && report.fileDataUrl) {
    return `
      <section class="uploaded-file-page uploaded-file-page--break">
        <div class="uploaded-file-header">
          <div class="uploaded-file-kicker">Uploaded Report File</div>
          <h2>${fileName}</h2>
        </div>
        <div class="uploaded-file-frame">
          <iframe src="${report.fileDataUrl}" title="${fileName}" class="uploaded-pdf"></iframe>
        </div>
      </section>
    `;
  }

  return '';
}

function buildPrintHtml(report, hospitalName) {
  const labTitle = `${hospitalName} Laboratory`;
  const reportId = escapeHtml(displayValue(report.reportId));
  const patientName = escapeHtml(displayValue(report.patientName));
  const patientId = escapeHtml(displayValue(report.patientId));
  const testName = escapeHtml(displayValue(report.testName));
  const doctorName = escapeHtml(displayValue(report.doctorName));
  const category = escapeHtml(displayValue(report.category, ''));
  const priority = escapeHtml(displayValue(report.priority, ''));
  const uploaded = escapeHtml(displayValue(report.uploadedDate));
  const sampleAt = escapeHtml(displayValue(report.sampleCollectedAt));
  const performedAt = escapeHtml(displayValue(report.testPerformedAt));
  const uploadedBy = escapeHtml(displayValue(report.uploadedByName));
  const remarks = escapeHtml(displayValue(report.remarks, ''));
  const location = visitLocationLabel(report);
  const encounterType = escapeHtml(location.visit);
  const wardName = escapeHtml(location.ward);
  const bedNumber = escapeHtml(location.bed);
  const printedAt = new Date().toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Lab Report — ${reportId}</title>
        <style>
          @page { size: A4; margin: 16mm; }
          * { box-sizing: border-box; }
          body {
            margin: 0;
            font-family: "Segoe UI", Arial, sans-serif;
            color: #0f2744;
            font-size: 13px;
            line-height: 1.45;
          }
          .report {
            max-width: 800px;
            margin: 0 auto;
          }
          .header {
            display: flex;
            justify-content: space-between;
            gap: 16px;
            border-bottom: 3px solid #1a5c34;
            padding-bottom: 14px;
            margin-bottom: 18px;
          }
          .brand h1 {
            margin: 0;
            font-size: 22px;
            letter-spacing: 0.02em;
            color: #1a5c34;
          }
          .brand p {
            margin: 4px 0 0;
            color: #5b6b7c;
            font-size: 12px;
          }
          .report-meta {
            text-align: right;
          }
          .report-meta .id {
            font-size: 16px;
            font-weight: 700;
          }
          .report-meta .muted {
            color: #6b7f99;
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.04em;
          }
          .section-title {
            margin: 0 0 8px;
            font-size: 12px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.06em;
            color: #1a5c34;
          }
          .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px 18px;
            margin-bottom: 18px;
            padding: 12px 14px;
            background: #f7faf8;
            border: 1px solid #d7e5db;
            border-radius: 8px;
          }
          .info-item .label {
            font-size: 10px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: #6b7f99;
          }
          .info-item .value {
            margin-top: 2px;
            font-size: 14px;
            font-weight: 600;
          }
          table.results {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 16px;
          }
          table.results th,
          table.results td {
            border: 1px solid #d5dee8;
            padding: 8px 10px;
            text-align: left;
            vertical-align: top;
          }
          table.results th {
            background: #eef6f0;
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.04em;
            color: #345043;
          }
          table.results .value-cell {
            font-weight: 700;
          }
          .empty-params {
            text-align: center;
            color: #6b7f99;
            font-style: italic;
          }
          .flag {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 999px;
            font-size: 10px;
            font-weight: 700;
            letter-spacing: 0.03em;
          }
          .flag-normal { background: #e8f8ef; color: #157a3d; }
          .flag-high { background: #fde8e8; color: #b42318; }
          .flag-low { background: #fff4e5; color: #b54708; }
          .remarks {
            margin-bottom: 18px;
            padding: 12px 14px;
            border: 1px solid #d5dee8;
            border-radius: 8px;
            background: #fff;
          }
          .remarks p {
            margin: 6px 0 0;
            white-space: pre-wrap;
          }
          .signatures {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 40px;
            margin-top: 36px;
          }
          .signatures .line {
            border-top: 1px solid #9aa8b8;
            padding-top: 8px;
            font-size: 12px;
            color: #5b6b7c;
          }
          .footer {
            margin-top: 28px;
            padding-top: 10px;
            border-top: 1px solid #d5dee8;
            font-size: 11px;
            color: #6b7f99;
            display: flex;
            justify-content: space-between;
            gap: 12px;
          }
          .uploaded-file-page {
            max-width: 800px;
            margin: 0 auto;
          }
          .uploaded-file-page--break,
          .uploaded-pdf-page {
            page-break-before: always;
            break-before: page;
          }
          .uploaded-file-header {
            margin-bottom: 16px;
            border-bottom: 2px solid #1a5c34;
            padding-bottom: 10px;
          }
          .uploaded-file-kicker {
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: #1a5c34;
            margin-bottom: 6px;
          }
          .uploaded-file-header h2 {
            margin: 0;
            font-size: 18px;
            color: #0f2744;
            word-break: break-word;
          }
          .uploaded-file-frame {
            border: 1px solid #d5dee8;
            border-radius: 8px;
            overflow: hidden;
            background: #fff;
          }
          .uploaded-image {
            display: block;
            width: 100%;
            height: auto;
          }
          .uploaded-pdf {
            display: block;
            width: 100%;
            min-height: 980px;
            border: 0;
            background: #fff;
          }
          .uploaded-pdf-page-frame {
            min-height: auto;
          }
          .uploaded-pdf-page-image {
            display: block;
            width: 100%;
            height: auto;
            max-height: 220mm;
            object-fit: contain;
          }
          @media print {
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .uploaded-file-page--break,
            .uploaded-pdf-page {
              page-break-before: always;
              break-before: page;
            }
            .uploaded-file-header {
              margin-bottom: 8px;
              padding-bottom: 6px;
            }
            .uploaded-pdf-page-image,
            .uploaded-image {
              max-height: 220mm;
            }
          }
        </style>
      </head>
      <body>
        <div class="report">
          <header class="header">
            <div class="brand">
              <h1>${escapeHtml(labTitle)}</h1>
              <p>${escapeHtml(hospitalName)} · Diagnostic Laboratory Report</p>
            </div>
            <div class="report-meta">
              <div class="muted">Report ID</div>
              <div class="id">${reportId}</div>
              <div class="muted" style="margin-top:8px">Printed</div>
              <div>${escapeHtml(printedAt)}</div>
            </div>
          </header>

          <h2 class="section-title">Patient &amp; Order Details</h2>
          <div class="info-grid">
            <div class="info-item">
              <div class="label">Patient Name</div>
              <div class="value">${patientName}</div>
            </div>
            <div class="info-item">
              <div class="label">Patient ID</div>
              <div class="value">${patientId}</div>
            </div>
            <div class="info-item">
              <div class="label">Source</div>
              <div class="value">${encounterType}</div>
            </div>
            <div class="info-item">
              <div class="label">Ward</div>
              <div class="value">${wardName}</div>
            </div>
            <div class="info-item">
              <div class="label">Bed</div>
              <div class="value">${bedNumber}</div>
            </div>
            <div class="info-item">
              <div class="label">Test Name</div>
              <div class="value">${testName}${category ? ` (${category})` : ''}</div>
            </div>
            <div class="info-item">
              <div class="label">Ordering Doctor</div>
              <div class="value">${doctorName}</div>
            </div>
            <div class="info-item">
              <div class="label">Sample Collected At</div>
              <div class="value">${sampleAt}</div>
            </div>
            <div class="info-item">
              <div class="label">Test Performed At</div>
              <div class="value">${performedAt}</div>
            </div>
            <div class="info-item">
              <div class="label">Report Uploaded</div>
              <div class="value">${uploaded}</div>
            </div>
            <div class="info-item">
              <div class="label">Reported By</div>
              <div class="value">${uploadedBy}${priority ? ` · Priority: ${priority}` : ''}</div>
            </div>
          </div>

          <h2 class="section-title">Test Results</h2>
          <table class="results">
            <thead>
              <tr>
                <th>Parameter</th>
                <th>Result</th>
                <th>Unit</th>
                <th>Reference Range</th>
                <th>Flag</th>
              </tr>
            </thead>
            <tbody>
              ${buildParametersRows(report.parameters)}
            </tbody>
          </table>

          ${
            remarks
              ? `<div class="remarks"><div class="section-title">Remarks / Notes</div><p>${remarks}</p></div>`
              : ''
          }

          <div class="signatures">
            <div class="line">Lab Technician / Reported By<br /><strong>${uploadedBy}</strong></div>
            <div class="line">Verified / Authorized Signatory</div>
          </div>

          <footer class="footer">
            <span>This is a computer-generated laboratory report from ${escapeHtml(labTitle)}.</span>
            <span>Confidential medical document</span>
          </footer>
        </div>
        ${buildUploadedFileSection(report)}
      </body>
    </html>
  `;
}

async function resolveReportForPrint(report) {
  if (!report) return null;

  const hasParameters = Array.isArray(report.parameters);
  const reportDbId = report.reportDbId ?? report.id;
  const shouldFetchFile = Boolean(report?.fileName || report?.hasFile);

  if (reportDbId == null) {
    return report;
  }

  const token = useAuthStore.getState()?.token;
  if (!token) return report;

  if (hasParameters && !shouldFetchFile) {
    return report;
  }

  try {
    const detail = hasParameters ? report : await fetchLabReportById(reportDbId, token);
    const pick = (next, prev) => {
      if (next == null || String(next).trim() === '' || next === '—') return prev;
      return next;
    };
    const nextReport = {
      ...report,
      ...detail,
      reportId: detail.reportId ?? report.reportId,
      patientName: pick(detail.patientName, report.patientName),
      patientId: pick(detail.patientId, report.patientId),
      testName: pick(detail.testName, report.testName),
      doctorName: pick(detail.doctorName, report.doctorName),
      uploadedDate: pick(detail.uploadedDate, report.uploadedDate),
      uploadedByName: pick(detail.uploadedByName, report.uploadedByName),
      parameters: detail.parameters ?? report.parameters ?? [],
    };

    if (detail?.fileName || report?.fileName || report?.hasFile) {
      try {
        const { blob, fileName, contentType } = await fetchLabReportFileBlob(reportDbId, token);
        nextReport.fileName = fileName ?? detail?.fileName ?? report?.fileName ?? null;
        nextReport.fileType = contentType ?? blob.type ?? detail?.fileType ?? report?.fileType ?? '';
        const previewKind = resolvePreviewKind(nextReport.fileType, nextReport.fileName);

        if (previewKind === 'pdf') {
          try {
            nextReport.pdfPageImages = await renderPdfPagesToDataUrls(blob);
          } catch {
            nextReport.fileDataUrl = await blobToDataUrl(blob);
          }
        } else {
          nextReport.fileDataUrl = await blobToDataUrl(blob);
        }
      } catch {
        // File preview in print is best-effort; keep report printable even if file fetch fails.
      }
    }

    return nextReport;
  } catch {
    return report;
  }
}

/** HTML for the in-app lab report print page. */
export async function getLabReportPrintHtml(report) {
  const fullReport = await resolveReportForPrint(report);
  if (!fullReport) return null;
  return buildPrintHtml(fullReport, APP_NAME || 'SaffoCare');
}

/** Print a single lab report in a real laboratory layout. */
export async function printLabReport(report) {
  if (!report) return;

  const content = await getLabReportPrintHtml(report);
  if (!content) {
    toast.error('Report data not available');
    return;
  }

  openPrintWindow(content);
}

/** Print a table of many reports (dashboard summary — not on archive page) */
export function printReportsSummary(reports, title = 'Lab Reports Summary') {
  const rows = reports
    .map(
      (r) => {
        const location = visitLocationLabel(r);
        return `
      <tr>
        <td>${escapeHtml(r.reportId)}</td>
        <td>${escapeHtml(r.patientName)}</td>
        <td>${escapeHtml(r.patientId)}</td>
        <td>${escapeHtml(location.visit)}</td>
        <td>${escapeHtml(location.ward)}</td>
        <td>${escapeHtml(location.bed)}</td>
        <td>${escapeHtml(r.testName)}</td>
        <td>${escapeHtml(r.doctorName)}</td>
        <td>${escapeHtml(r.uploadedByName)}</td>
        <td>${escapeHtml(r.uploadedDate)}</td>
      </tr>`;
      },
    )
    .join('');

  const content = `
    <html>
      <head><title>${escapeHtml(title)}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 24px; color: #1a2535; font-size: 13px; }
        h1 { font-size: 18px; margin-bottom: 16px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #dde6f2; padding: 8px 10px; text-align: left; }
        th { background: #f4f7fb; font-size: 11px; text-transform: uppercase; }
      </style></head>
      <body>
        <h1>${escapeHtml(title)}</h1>
        <p>${reports.length} report(s)</p>
        <table>
          <thead>
            <tr>
              <th>Report ID</th>
              <th>Patient</th>
              <th>Patient ID</th>
              <th>Source</th>
              <th>Ward</th>
              <th>Bed</th>
              <th>Test</th>
              <th>Doctor</th>
              <th>Lab Technician</th>
              <th>Uploaded</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </body>
    </html>
  `;
  openPrintWindow(content);
}

/** Download archive as CSV (completed reports page only) */
export function downloadReportsCsv(reports) {
  const header = [
    'Report ID',
    'Patient Name',
    'Patient ID',
    'Source',
    'Ward',
    'Bed',
    'Test',
    'Doctor',
    'Lab Technician',
    'Uploaded',
  ];
  const lines = [
    header.join(','),
    ...reports.map((r) => {
      const location = visitLocationLabel(r);
      return [
        r.reportId,
        r.patientName,
        r.patientId,
        location.visit,
        location.ward,
        location.bed,
        r.testName,
        r.doctorName,
        r.uploadedByName,
        r.uploadedDate,
      ]
        .map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`)
        .join(',');
    }),
  ];
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `lab-reports-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function openPrintWindow(html) {
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.setAttribute('title', 'Print report');
  iframe.style.cssText =
    'position:fixed;right:0;bottom:0;width:0;height:0;border:0;opacity:0;pointer-events:none;';

  let cleaned = false;
  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    URL.revokeObjectURL(url);
    iframe.remove();
  };

  iframe.addEventListener(
    'load',
    () => {
      const win = iframe.contentWindow;
      if (!win) {
        cleanup();
        toast.error('Could not open printer');
        return;
      }
      win.addEventListener('afterprint', cleanup, { once: true });
      setTimeout(cleanup, 120_000);
      try {
        win.focus();
        win.print();
      } catch {
        cleanup();
        toast.error('Could not open printer');
      }
    },
    { once: true },
  );

  iframe.src = url;
  document.body.appendChild(iframe);
}

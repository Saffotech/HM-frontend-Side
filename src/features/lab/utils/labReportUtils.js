/** Print a single lab report */
export function printLabReport(report) {
  const content = `
    <html>
      <head><title>Lab Report — ${report.reportId}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 32px; color: #1a2535; }
        h1 { color: #0f2744; border-bottom: 2px solid #1a9fd4; padding-bottom: 10px; }
        .field { margin: 10px 0; }
        .label { font-size: 11px; font-weight: 700; text-transform: uppercase; color: #6b7f99; }
        .value { font-size: 15px; font-weight: 600; }
      </style></head>
      <body>
        <h1>Lab Report — ${report.reportId}</h1>
        <div class="field"><div class="label">Patient</div><div class="value">${report.patientName}</div></div>
        <div class="field"><div class="label">Patient ID</div><div class="value">${report.patientId}</div></div>
        <div class="field"><div class="label">Test</div><div class="value">${report.testName}</div></div>
        <div class="field"><div class="label">Doctor</div><div class="value">${report.doctorName}</div></div>
        <div class="field"><div class="label">Uploaded</div><div class="value">${report.uploadedDate}</div></div>
      </body>
    </html>
  `;
  openPrintWindow(content);
}

/** Print a table of many reports (dashboard summary — not on archive page) */
export function printReportsSummary(reports, title = 'Lab Reports Summary') {
  const rows = reports
    .map(
      (r) => `
      <tr>
        <td>${r.reportId}</td>
        <td>${r.patientName}</td>
        <td>${r.patientId}</td>
        <td>${r.testName}</td>
        <td>${r.doctorName}</td>
        <td>${r.uploadedDate}</td>
      </tr>`
    )
    .join('');

  const content = `
    <html>
      <head><title>${title}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 24px; color: #1a2535; font-size: 13px; }
        h1 { font-size: 18px; margin-bottom: 16px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #dde6f2; padding: 8px 10px; text-align: left; }
        th { background: #f4f7fb; font-size: 11px; text-transform: uppercase; }
      </style></head>
      <body>
        <h1>${title}</h1>
        <p>${reports.length} report(s)</p>
        <table>
          <thead>
            <tr>
              <th>Report ID</th>
              <th>Patient</th>
              <th>Patient ID</th>
              <th>Test</th>
              <th>Doctor</th>
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
  const header = ['Report ID', 'Patient Name', 'Patient ID', 'Test', 'Doctor', 'Uploaded'];
  const lines = [
    header.join(','),
    ...reports.map((r) =>
      [r.reportId, r.patientName, r.patientId, r.testName, r.doctorName, r.uploadedDate]
        .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
        .join(',')
    ),
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
  const win = window.open('', '_blank');
  if (win) {
    win.document.write(html);
    win.document.close();
    win.print();
  }
}

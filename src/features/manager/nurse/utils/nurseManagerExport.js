function csvEscape(value) {
  const text = value == null ? '' : String(value);
  if (!/[,"\n]/.test(text)) return text;
  return `"${text.replace(/"/g, '""')}"`;
}

export function exportRowsAsCsv(filename, rows = []) {
  if (!Array.isArray(rows) || rows.length === 0) return false;
  const headers = Object.keys(rows[0] ?? {});
  const lines = [headers.join(',')];
  rows.forEach((row) => {
    lines.push(headers.map((header) => csvEscape(row[header])).join(','));
  });
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  return true;
}

export function exportRowsAsPrintView(title) {
  // TODO(api): Replace with backend PDF export endpoint when available.
  const oldTitle = document.title;
  document.title = title;
  window.print();
  document.title = oldTitle;
}

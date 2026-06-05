import { jsPDF } from 'https://cdn.jsdelivr.net/npm/jspdf@2.5.2/+esm';

function exportFilename(formatId, ext) {
  const date = new Date().toISOString().slice(0, 10);
  return `poster-${formatId}-${date}.${ext}`;
}

function triggerDownload(dataUrl, filename) {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename;
  a.click();
}

export function downloadPng(canvas, formatId) {
  triggerDownload(canvas.toDataURL('image/png'), exportFilename(formatId, 'png'));
}

export function downloadJpg(canvas, formatId) {
  triggerDownload(canvas.toDataURL('image/jpeg', 0.95), exportFilename(formatId, 'jpg'));
}

export function downloadPdf(canvas, formatId, format) {
  const imgData = canvas.toDataURL('image/jpeg', 0.95);
  const orientation = format.widthPx >= format.heightPx ? 'landscape' : 'portrait';

  const pdf = new jsPDF({
    orientation,
    unit: 'mm',
    format: [format.widthMm, format.heightMm],
  });

  pdf.addImage(imgData, 'JPEG', 0, 0, format.widthMm, format.heightMm);
  pdf.save(exportFilename(formatId, 'pdf'));
}

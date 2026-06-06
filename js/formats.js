const DPI = 300;

export function mmToPx(mm) {
  return Math.round((mm * DPI) / 25.4);
}

const PRINT_FORMATS = {
  'a4-verticale': { widthMm: 210, heightMm: 297, label: 'A4 ↕' },
  'a4-orizzontale': { widthMm: 297, heightMm: 210, label: 'A4 ↔' },
  'a3-verticale': { widthMm: 297, heightMm: 420, label: 'A3 ↕' },
  'a3-orizzontale': { widthMm: 420, heightMm: 297, label: 'A3 ↔' },
};

const WEB_BASE_WIDTH = 1920;

export const FORMATS = {
  ...Object.fromEntries(
    Object.entries(PRINT_FORMATS).map(([key, f]) => [
      key,
      {
        id: key,
        label: f.label,
        widthPx: mmToPx(f.widthMm),
        heightPx: mmToPx(f.heightMm),
        widthMm: f.widthMm,
        heightMm: f.heightMm,
        dpi: DPI,
        isPrint: true,
      },
    ])
  ),
  web: {
    id: 'web',
    label: 'Web',
    widthPx: WEB_BASE_WIDTH,
    heightPx: Math.round(WEB_BASE_WIDTH * (9 / 16)),
    widthMm: (WEB_BASE_WIDTH * 25.4) / DPI,
    heightMm: (Math.round(WEB_BASE_WIDTH * (9 / 16)) * 25.4) / DPI,
    dpi: DPI,
    isPrint: false,
  },
};

export function getFormat(id) {
  const format = FORMATS[id];
  if (!format) throw new Error(`Unknown format: ${id}`);
  return format;
}


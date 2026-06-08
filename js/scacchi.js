const svgCache = new Map();

export function isScacchiSrc(src) {
  return src.includes('immagini/scacchi/');
}

export function isScacchiOnly(selectedCategories) {
  return selectedCategories.size === 1 && selectedCategories.has('scacchi');
}

function parseViewBox(svgEl) {
  const parts = svgEl.getAttribute('viewBox')?.split(/\s+/).map(Number);
  if (!parts || parts.length !== 4) return { width: 100, height: 100 };
  return { width: parts[2], height: parts[3] };
}

function prepareSvgDocument(svgText, { outline, color, strokeWeight }) {
  const doc = new DOMParser().parseFromString(svgText, 'image/svg+xml');
  const svg = doc.documentElement;
  const { width, height } = parseViewBox(svg);
  const minDim = Math.min(width, height);
  const strokeWidth = outline ? (strokeWeight / 100) * minDim * 0.1 : 0;

  doc.querySelectorAll('path').forEach((path) => {
    path.removeAttribute('class');
    if (outline) {
      path.setAttribute('fill', 'none');
      path.setAttribute('stroke', color);
      path.setAttribute('stroke-width', String(strokeWidth));
      path.setAttribute('stroke-linejoin', 'round');
      path.setAttribute('stroke-linecap', 'round');
    } else {
      path.setAttribute('fill', color);
      path.setAttribute('stroke', 'none');
    }
  });

  return new XMLSerializer().serializeToString(svg);
}

async function svgTextToImage(svgText, loadImage) {
  const blob = new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  try {
    return await loadImage(url);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function loadScacchiAsset(src, options, loadImage) {
  const cacheKey = `${src}|${JSON.stringify(options)}`;
  if (svgCache.has(cacheKey)) return svgCache.get(cacheKey);

  const promise = fetch(src)
    .then((res) => {
      if (!res.ok) throw new Error(`SVG non trovato: ${src}`);
      return res.text();
    })
    .then((text) => prepareSvgDocument(text, options))
    .then((svg) => svgTextToImage(svg, loadImage));

  svgCache.set(cacheKey, promise);
  return promise;
}

export function getScacchiGapPx(format) {
  const W = format.widthPx;
  const H = format.heightPx;
  const { cols, rows } = format.grid;

  const gridAreaW = W * 0.9;
  const gridAreaH = H * 0.82;
  const cellMin = Math.min(gridAreaW / cols, gridAreaH / rows);

  return Math.max(14, Math.round(cellMin * 0.1));
}

export const SCACCHI_FIT_SCALE = 0.8;

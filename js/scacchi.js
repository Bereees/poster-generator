import { resolveAssetUrl } from './assets.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const RENDER_MIN_PX = 420;
const svgCache = new Map();

export function isScacchiSrc(src) {
  return src.includes('immagini/scacchi/');
}

export function isScacchiOnly(selectedCategories) {
  return selectedCategories.size === 1 && selectedCategories.has('scacchi');
}

export function hasScacchiCategory(selectedCategories) {
  return selectedCategories.has('scacchi');
}

function parseViewBox(svgEl) {
  const parts = svgEl.getAttribute('viewBox')?.split(/\s+/).map(Number);
  if (!parts || parts.length !== 4) {
    return { x: 0, y: 0, width: 100, height: 100, minDim: 100 };
  }
  const width = parts[2];
  const height = parts[3];
  return { x: parts[0], y: parts[1], width, height, minDim: Math.min(width, height) };
}

function getOrCreateDefs(doc, svg) {
  let defs = doc.querySelector('defs');
  if (!defs) {
    defs = doc.createElementNS(SVG_NS, 'defs');
    svg.insertBefore(defs, svg.firstChild);
  }
  return defs;
}

function createOutlineFilter(doc, svg, color, radius) {
  const viewBox = parseViewBox(svg);
  const bleed = radius * 3;
  const fx = viewBox.x - bleed;
  const fy = viewBox.y - bleed;
  const fw = viewBox.width + bleed * 2;
  const fh = viewBox.height + bleed * 2;

  const filter = doc.createElementNS(SVG_NS, 'filter');
  filter.setAttribute('id', 'pg-outline');
  filter.setAttribute('filterUnits', 'userSpaceOnUse');
  filter.setAttribute('x', String(fx));
  filter.setAttribute('y', String(fy));
  filter.setAttribute('width', String(fw));
  filter.setAttribute('height', String(fh));
  filter.setAttribute('color-interpolation-filters', 'sRGB');

  const dilate = doc.createElementNS(SVG_NS, 'feMorphology');
  dilate.setAttribute('operator', 'dilate');
  dilate.setAttribute('radius', String(radius));
  dilate.setAttribute('in', 'SourceAlpha');
  dilate.setAttribute('result', 'dilated');

  const ring = doc.createElementNS(SVG_NS, 'feComposite');
  ring.setAttribute('in', 'dilated');
  ring.setAttribute('in2', 'SourceAlpha');
  ring.setAttribute('operator', 'out');
  ring.setAttribute('result', 'outline');

  const flood = doc.createElementNS(SVG_NS, 'feFlood');
  flood.setAttribute('flood-color', color);
  flood.setAttribute('result', 'flood');

  const colored = doc.createElementNS(SVG_NS, 'feComposite');
  colored.setAttribute('in', 'flood');
  colored.setAttribute('in2', 'outline');
  colored.setAttribute('operator', 'in');
  colored.setAttribute('result', 'colored');

  const merge = doc.createElementNS(SVG_NS, 'feMerge');
  const mergeNode = doc.createElementNS(SVG_NS, 'feMergeNode');
  mergeNode.setAttribute('in', 'colored');
  merge.appendChild(mergeNode);

  filter.append(dilate, ring, flood, colored, merge);
  doc.querySelector('#pg-outline')?.remove();
  getOrCreateDefs(doc, svg).appendChild(filter);
}

function setSvgRenderSize(svg, viewBox) {
  const scale = Math.max(1, RENDER_MIN_PX / viewBox.minDim);
  svg.setAttribute('width', String(Math.round(viewBox.width * scale)));
  svg.setAttribute('height', String(Math.round(viewBox.height * scale)));
}

function prepareFillSvg(svgText, color) {
  const doc = new DOMParser().parseFromString(svgText, 'image/svg+xml');
  const svg = doc.documentElement;
  const viewBox = parseViewBox(svg);

  doc.querySelectorAll('style').forEach((node) => node.remove());
  doc.querySelectorAll('path').forEach((path) => {
    path.removeAttribute('class');
    path.setAttribute('fill', color);
    path.setAttribute('stroke', 'none');
  });

  setSvgRenderSize(svg, viewBox);
  return new XMLSerializer().serializeToString(svg);
}

function prepareOutlineSvg(svgText, strokeWeight) {
  const doc = new DOMParser().parseFromString(svgText, 'image/svg+xml');
  const svg = doc.documentElement;
  const viewBox = parseViewBox(svg);
  const radius = (strokeWeight / 100) * viewBox.minDim * 0.055;
  const pad = Math.max(radius * 4, viewBox.minDim * 0.1);

  doc.querySelectorAll('style').forEach((node) => node.remove());

  const expanded = {
    x: viewBox.x - pad,
    y: viewBox.y - pad,
    width: viewBox.width + pad * 2,
    height: viewBox.height + pad * 2,
    minDim: Math.min(viewBox.width + pad * 2, viewBox.height + pad * 2),
  };

  svg.setAttribute('viewBox', `${expanded.x} ${expanded.y} ${expanded.width} ${expanded.height}`);

  doc.querySelectorAll('path').forEach((path) => {
    path.removeAttribute('class');
    path.setAttribute('fill', '#000');
    path.setAttribute('stroke', 'none');
  });

  createOutlineFilter(doc, svg, '#000', radius);

  const wrapper = doc.createElementNS(SVG_NS, 'g');
  wrapper.setAttribute('filter', 'url(#pg-outline)');
  [...svg.childNodes].forEach((node) => {
    if (node.nodeName !== 'defs') wrapper.appendChild(node);
  });
  svg.appendChild(wrapper);

  setSvgRenderSize(svg, expanded);
  return new XMLSerializer().serializeToString(svg);
}

function tintImage(source, color) {
  const canvas = document.createElement('canvas');
  canvas.width = source.width;
  canvas.height = source.height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(source, 0, 0);
  ctx.globalCompositeOperation = 'source-in';
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  return canvas;
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

async function loadOutlineBase(src, strokeWeight, loadImage) {
  const cacheKey = `${src}|outline|${strokeWeight}`;
  if (!svgCache.has(cacheKey)) {
    const promise = fetch(resolveAssetUrl(src))
      .then((res) => {
        if (!res.ok) throw new Error(`SVG non trovato: ${src}`);
        return res.text();
      })
      .then((text) => prepareOutlineSvg(text, strokeWeight))
      .then((svg) => svgTextToImage(svg, loadImage));
    svgCache.set(cacheKey, promise);
  }
  return svgCache.get(cacheKey);
}

async function loadFillAsset(src, color, loadImage) {
  const cacheKey = `${src}|fill|${color}`;
  if (!svgCache.has(cacheKey)) {
    const promise = fetch(resolveAssetUrl(src))
      .then((res) => {
        if (!res.ok) throw new Error(`SVG non trovato: ${src}`);
        return res.text();
      })
      .then((text) => prepareFillSvg(text, color))
      .then((svg) => svgTextToImage(svg, loadImage));
    svgCache.set(cacheKey, promise);
  }
  return svgCache.get(cacheKey);
}

export async function loadScacchiAsset(src, options, loadImage) {
  if (options.outline) {
    const base = await loadOutlineBase(src, options.strokeWeight, loadImage);
    return tintImage(base, options.color);
  }
  return loadFillAsset(src, options.color, loadImage);
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
export const SCACCHI_FIT_SCALE_MIXED = 0.68;
export const SCACCHI_OUTLINE_FIT_FACTOR = 0.9;

export function getScacchiFitScale(scacchiOnly, outline = false) {
  const base = scacchiOnly ? SCACCHI_FIT_SCALE : SCACCHI_FIT_SCALE_MIXED;
  return outline ? base * SCACCHI_OUTLINE_FIT_FACTOR : base;
}

import { resolveAssetUrl } from './assets.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const RENDER_MIN_PX = 420;
const svgCache = new Map();

export function clearSvgCache() {
  svgCache.clear();
}
const VECTOR_CATEGORY_IDS = new Set([
  'scacchi',
  'scacchicomplessi',
  'necropoli',
  'necropolilogo',
  'poesie',
  'stemmi',
  'articoli',
]);
const SHAPE_SELECTOR = 'path, polyline, polygon, line, circle, ellipse, rect';

export function isVectorCategorySrc(src) {
  for (const id of VECTOR_CATEGORY_IDS) {
    if (src.includes(`immagini/${id}/`)) return true;
  }
  return false;
}

export function isScacchiSrc(src) {
  return src.includes('immagini/scacchi/');
}

export function isScacchiComplessiSrc(src) {
  return src.includes('immagini/scacchicomplessi/');
}

export function isScacchiComplessiOnly(selectedCategories) {
  return selectedCategories.size === 1 && selectedCategories.has('scacchicomplessi');
}

export function hasScacchiComplessiCategory(selectedCategories) {
  return selectedCategories.has('scacchicomplessi');
}

export function hasChessLikeCategory(selectedCategories) {
  return hasScacchiCategory(selectedCategories) || hasScacchiComplessiCategory(selectedCategories);
}

export function isNecropoliSrc(src) {
  return src.includes('immagini/necropoli/');
}

export function isNecropolilogoSrc(src) {
  return src.includes('immagini/necropolilogo/');
}

export function isNecropoliFamilySrc(src) {
  return isNecropoliSrc(src) || isNecropolilogoSrc(src);
}

export function isNecropolilogoOnly(selectedCategories) {
  return selectedCategories.size === 1 && selectedCategories.has('necropolilogo');
}

export function hasNecropolilogoCategory(selectedCategories) {
  return selectedCategories.has('necropolilogo');
}

export function isPoesieSrc(src) {
  return src.includes('immagini/poesie/');
}

export function isPoesieOnly(selectedCategories) {
  return selectedCategories.size === 1 && selectedCategories.has('poesie');
}

export function hasPoesieCategory(selectedCategories) {
  return selectedCategories.has('poesie');
}

export function isArticoliSrc(src) {
  return src.includes('immagini/articoli/');
}

export function isArticoliOnly(selectedCategories) {
  return selectedCategories.size === 1 && selectedCategories.has('articoli');
}

export function hasArticoliCategory(selectedCategories) {
  return selectedCategories.has('articoli');
}

export function isStemmiSrc(src) {
  return src.includes('immagini/stemmi/');
}

export function isStemmiOnly(selectedCategories) {
  return selectedCategories.size === 1 && selectedCategories.has('stemmi');
}

export function hasStemmiCategory(selectedCategories) {
  return selectedCategories.has('stemmi');
}

export function hasVectorCategory(selectedCategories) {
  for (const id of VECTOR_CATEGORY_IDS) {
    if (selectedCategories.has(id)) return true;
  }
  return false;
}

export function isVectorCategoryOnly(selectedCategories) {
  if (selectedCategories.size !== 1) return false;
  return VECTOR_CATEGORY_IDS.has([...selectedCategories][0]);
}

export function isScacchiOnly(selectedCategories) {
  return selectedCategories.size === 1 && selectedCategories.has('scacchi');
}

export function isNecropoliOnly(selectedCategories) {
  return selectedCategories.size === 1 && selectedCategories.has('necropoli');
}

export function hasScacchiCategory(selectedCategories) {
  return selectedCategories.has('scacchi');
}

export function hasNecropoliCategory(selectedCategories) {
  return selectedCategories.has('necropoli');
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

function measureSvgContentBounds(svg) {
  if (typeof document === 'undefined') return null;

  const host = document.createElement('div');
  host.setAttribute('aria-hidden', 'true');
  host.style.cssText = 'position:fixed;left:-10000px;top:0;width:0;height:0;overflow:hidden;';
  host.appendChild(svg.cloneNode(true));
  document.body.appendChild(host);

  try {
    const shapes = host.querySelectorAll(SHAPE_SELECTOR);
    if (!shapes.length) return null;

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    shapes.forEach((el) => {
      if (typeof el.getBBox !== 'function') return;
      const box = el.getBBox();
      if (!Number.isFinite(box.width) || !Number.isFinite(box.height)) return;
      if (box.width === 0 && box.height === 0) return;
      minX = Math.min(minX, box.x);
      minY = Math.min(minY, box.y);
      maxX = Math.max(maxX, box.x + box.width);
      maxY = Math.max(maxY, box.y + box.height);
    });

    if (!Number.isFinite(minX)) return null;
    return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
  } finally {
    host.remove();
  }
}

function normalizeSvgViewBoxToContent(svg, paddingRatio = 0.06) {
  const bounds = measureSvgContentBounds(svg);
  if (!bounds || bounds.width <= 0 || bounds.height <= 0) return null;

  const pad = Math.max(bounds.width, bounds.height) * paddingRatio;
  const viewBox = {
    x: bounds.x - pad,
    y: bounds.y - pad,
    width: bounds.width + pad * 2,
    height: bounds.height + pad * 2,
    minDim: Math.min(bounds.width + pad * 2, bounds.height + pad * 2),
  };

  svg.setAttribute('viewBox', `${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`);
  svg.removeAttribute('width');
  svg.removeAttribute('height');
  return viewBox;
}

function applyPoetryTextColor(el, color) {
  el.removeAttribute('class');
  el.setAttribute('fill', color);

  if (el.hasAttribute('style')) {
    const props = {};
    el.getAttribute('style')
      .split(';')
      .forEach((decl) => {
        const colon = decl.indexOf(':');
        if (colon === -1) return;
        const key = decl.slice(0, colon).trim().toLowerCase();
        const val = decl.slice(colon + 1).trim();
        if (key && val && key !== 'fill') props[key] = val;
      });
    const remaining = Object.entries(props)
      .map(([key, val]) => `${key}:${val}`)
      .join(';');
    if (remaining) el.setAttribute('style', remaining);
    else el.removeAttribute('style');
  }
}

function prepareTextSvg(svgText, color) {
  const doc = new DOMParser().parseFromString(svgText, 'image/svg+xml');
  const svg = doc.documentElement;
  const viewBox = parseViewBox(svg);

  doc.querySelectorAll('style').forEach((node) => node.remove());
  doc.querySelectorAll('text, tspan').forEach((el) => {
    applyPoetryTextColor(el, color);
    if (el.tagName.toLowerCase() === 'text') {
      const style = el.getAttribute('style') || '';
      if (!el.getAttribute('font-family') && !style.includes('font-family')) {
        el.setAttribute('font-family', 'Roboto, sans-serif');
      }
      if (!el.getAttribute('font-weight') && !style.includes('font-weight')) {
        el.setAttribute('font-weight', '500');
      }
    }
  });

  setSvgRenderSize(svg, viewBox);
  return new XMLSerializer().serializeToString(svg);
}

function normalizeStrokeWidth(value) {
  if (!value) return '0.5';
  return String(value).replace(/px$/i, '').trim() || '0.5';
}

function scaleStrokeWidth(value, weightPercent = 100) {
  const base = parseFloat(normalizeStrokeWidth(value));
  if (!Number.isFinite(base)) return normalizeStrokeWidth(value);
  return String(base * (weightPercent / 100));
}

function parseSvgClassStyles(doc) {
  const classStyles = new Map();

  doc.querySelectorAll('style').forEach((styleNode) => {
    const text = styleNode.textContent || '';
    const rulePattern = /([^{]+)\{([^}]*)\}/g;
    let match;
    while ((match = rulePattern.exec(text)) !== null) {
      const selectors = match[1].split(',').map((s) => s.trim());
      const props = {};
      match[2].split(';').forEach((decl) => {
        const colon = decl.indexOf(':');
        if (colon === -1) return;
        const key = decl.slice(0, colon).trim();
        const val = decl.slice(colon + 1).trim();
        if (key && val) props[key] = val;
      });

      for (const sel of selectors) {
        const clsMatch = sel.match(/\.(cls-\d+)/);
        if (!clsMatch) continue;
        const cls = clsMatch[1];
        if (!classStyles.has(cls)) classStyles.set(cls, {});
        Object.assign(classStyles.get(cls), props);
      }
    }
  });

  return classStyles;
}

function resolveElementStyle(el, classStyles) {
  const style = {};
  const classes = (el.getAttribute('class') || '').split(/\s+/).filter(Boolean);

  for (const cls of classes) {
    const rules = classStyles.get(cls);
    if (rules) Object.assign(style, rules);
  }

  for (const attr of ['fill', 'stroke', 'stroke-width', 'stroke-miterlimit', 'stroke-dasharray', 'stroke-linecap']) {
    if (el.hasAttribute(attr)) style[attr] = el.getAttribute(attr);
  }

  if (el.hasAttribute('style')) {
    el.getAttribute('style')
      .split(';')
      .forEach((decl) => {
        const colon = decl.indexOf(':');
        if (colon === -1) return;
        const key = decl.slice(0, colon).trim();
        const val = decl.slice(colon + 1).trim();
        if (key && val) style[key] = val;
      });
  }

  return style;
}

function prepareStrokeSvg(svgText, color, strokeWeight = 100) {
  const doc = new DOMParser().parseFromString(svgText, 'image/svg+xml');
  const svg = doc.documentElement;
  const viewBox = parseViewBox(svg);
  const classStyles = parseSvgClassStyles(doc);
  const strokeTags = ['path', 'polyline', 'polygon', 'line', 'circle', 'ellipse', 'rect'];

  doc.querySelectorAll('style').forEach((node) => node.remove());

  doc.querySelectorAll(strokeTags.join(',')).forEach((el) => {
    const style = resolveElementStyle(el, classStyles);
    el.removeAttribute('class');
    el.setAttribute('fill', 'none');

    const hasStroke = style.stroke && style.stroke !== 'none';
    if (!hasStroke) {
      el.setAttribute('stroke', 'none');
      return;
    }

    el.setAttribute('stroke', color);
    el.setAttribute('stroke-miterlimit', style['stroke-miterlimit'] || '10');
    el.setAttribute(
      'stroke-width',
      scaleStrokeWidth(style['stroke-width'] || el.getAttribute('stroke-width'), strokeWeight)
    );
  });

  setSvgRenderSize(svg, viewBox);
  return new XMLSerializer().serializeToString(svg);
}

function prepareArticoliFillSvg(svgText, color) {
  const doc = new DOMParser().parseFromString(svgText, 'image/svg+xml');
  const svg = doc.documentElement;
  const viewBox = parseViewBox(svg);
  const classStyles = parseSvgClassStyles(doc);
  const shapeTags = ['path', 'polyline', 'polygon', 'line', 'circle', 'ellipse', 'rect', 'text'];

  doc.querySelectorAll('style').forEach((node) => node.remove());

  doc.querySelectorAll(shapeTags.join(',')).forEach((el) => {
    const style = resolveElementStyle(el, classStyles);
    el.removeAttribute('class');

    const fill = style.fill;
    if (!fill || fill === 'none') {
      el.setAttribute('fill', 'none');
      if (el.tagName.toLowerCase() !== 'text') {
        el.setAttribute('stroke', 'none');
      }
      return;
    }

    el.setAttribute('fill', color);
    if (el.tagName.toLowerCase() !== 'text') {
      el.setAttribute('stroke', 'none');
    }
  });

  setSvgRenderSize(svg, viewBox);
  return new XMLSerializer().serializeToString(svg);
}

function prepareNecropoliSvg(svgText, color) {
  const doc = new DOMParser().parseFromString(svgText, 'image/svg+xml');
  const svg = doc.documentElement;
  const viewBox = parseViewBox(svg);
  const classStyles = parseSvgClassStyles(doc);
  const shapeTags = ['path', 'polyline', 'polygon', 'line', 'circle', 'ellipse', 'rect'];

  doc.querySelectorAll('style').forEach((node) => node.remove());

  doc.querySelectorAll(shapeTags.join(',')).forEach((el) => {
    const style = resolveElementStyle(el, classStyles);
    el.removeAttribute('class');
    el.removeAttribute('style');

    const hasStroke = style.stroke && style.stroke !== 'none';
    const hasFill = style.fill && style.fill !== 'none';
    const usesDefaultFill = style.fill === undefined && style.stroke === undefined;

    if (hasFill || usesDefaultFill) {
      el.setAttribute('fill', color);
    } else {
      el.setAttribute('fill', 'none');
    }

    if (hasStroke) {
      el.setAttribute('stroke', color);
      el.setAttribute('stroke-miterlimit', style['stroke-miterlimit'] || '10');
      el.setAttribute(
        'stroke-width',
        normalizeStrokeWidth(style['stroke-width'] || el.getAttribute('stroke-width'))
      );
      if (style['stroke-dasharray']) {
        el.setAttribute('stroke-dasharray', style['stroke-dasharray']);
      }
      if (style['stroke-linecap']) {
        el.setAttribute('stroke-linecap', style['stroke-linecap']);
      }
    } else {
      el.setAttribute('stroke', 'none');
    }
  });

  setSvgRenderSize(svg, viewBox);
  return new XMLSerializer().serializeToString(svg);
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

function prepareScacchiComplessiFillSvg(svgText, color, src = '') {
  const doc = new DOMParser().parseFromString(svgText, 'image/svg+xml');
  const svg = doc.documentElement;

  doc.querySelectorAll('style').forEach((node) => node.remove());
  doc.querySelectorAll(SHAPE_SELECTOR).forEach((el) => {
    el.removeAttribute('class');
    el.removeAttribute('style');
    el.setAttribute('fill', color);
    el.setAttribute('stroke', 'none');
  });

  const keepViewBox = src.includes('scaccomarinore.svg');
  const viewBox = (!keepViewBox && normalizeSvgViewBoxToContent(svg)) || parseViewBox(svg);
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

async function svgTextToImage(svgText) {
  const blob = new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  try {
    const img = await new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('Failed to load SVG'));
      image.src = url;
    });
    if (img.decode) await img.decode();
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function loadOutlineBase(src, strokeWeight, loadImage) {
  const cacheKey = `${src}|outline|${strokeWeight}`;
  if (!svgCache.has(cacheKey)) {
    const promise = fetch(resolveAssetUrl(src), { cache: 'no-store' })
      .then((res) => {
        if (!res.ok) throw new Error(`SVG non trovato: ${src}`);
        return res.text();
      })
      .then((text) => prepareOutlineSvg(text, strokeWeight))
      .then((svg) => svgTextToImage(svg));
    svgCache.set(cacheKey, promise);
  }
  return svgCache.get(cacheKey);
}

async function loadPoesieAsset(src, color, loadImage) {
  const cacheKey = `${src}|text|${color}`;
  if (!svgCache.has(cacheKey)) {
    const promise = fetch(resolveAssetUrl(src), { cache: 'no-store' })
      .then((res) => {
        if (!res.ok) throw new Error(`SVG non trovato: ${src}`);
        return res.text();
      })
      .then((text) => prepareTextSvg(text, color))
      .then((svg) => svgTextToImage(svg));
    svgCache.set(cacheKey, promise);
  }
  return svgCache.get(cacheKey);
}

async function loadArticoliAsset(src, color, loadImage) {
  const cacheKey = `${src}|articoli|${color}`;
  if (!svgCache.has(cacheKey)) {
    const promise = fetch(resolveAssetUrl(src), { cache: 'no-store' })
      .then((res) => {
        if (!res.ok) throw new Error(`SVG non trovato: ${src}`);
        return res.text();
      })
      .then((text) => prepareArticoliFillSvg(text, color))
      .then((svg) => svgTextToImage(svg));
    svgCache.set(cacheKey, promise);
  }
  return svgCache.get(cacheKey);
}

async function loadStemmiAsset(src, color, strokeWeight, loadImage) {
  const cacheKey = `${src}|stroke|${color}|${strokeWeight}`;
  if (!svgCache.has(cacheKey)) {
    const promise = fetch(resolveAssetUrl(src), { cache: 'no-store' })
      .then((res) => {
        if (!res.ok) throw new Error(`SVG non trovato: ${src}`);
        return res.text();
      })
      .then((text) => prepareStrokeSvg(text, color, strokeWeight))
      .then((svg) => svgTextToImage(svg));
    svgCache.set(cacheKey, promise);
  }
  return svgCache.get(cacheKey);
}

async function loadNecropoliAsset(src, color, loadImage) {
  const cacheKey = `${src}|necropoli|${color}`;
  if (!svgCache.has(cacheKey)) {
    const promise = fetch(resolveAssetUrl(src), { cache: 'no-store' })
      .then((res) => {
        if (!res.ok) throw new Error(`SVG non trovato: ${src}`);
        return res.text();
      })
      .then((text) => prepareNecropoliSvg(text, color))
      .then((svg) => svgTextToImage(svg));
    svgCache.set(cacheKey, promise);
  }
  return svgCache.get(cacheKey);
}

async function loadFillAsset(src, color, loadImage) {
  const cacheKey = `${src}|fill|${color}`;
  if (!svgCache.has(cacheKey)) {
    const promise = fetch(resolveAssetUrl(src), { cache: 'no-store' })
      .then((res) => {
        if (!res.ok) throw new Error(`SVG non trovato: ${src}`);
        return res.text();
      })
      .then((text) => prepareFillSvg(text, color))
      .then((svg) => svgTextToImage(svg));
    svgCache.set(cacheKey, promise);
  }
  return svgCache.get(cacheKey);
}

async function loadScacchiComplessiAsset(src, color, loadImage) {
  const cacheKey = `${src}|scacchi-complessi|${color}`;
  if (!svgCache.has(cacheKey)) {
    const promise = fetch(resolveAssetUrl(src), { cache: 'no-store' })
      .then((res) => {
        if (!res.ok) throw new Error(`SVG non trovato: ${src}`);
        return res.text();
      })
      .then((text) => prepareScacchiComplessiFillSvg(text, color, src))
      .then((svg) => svgTextToImage(svg));
    svgCache.set(cacheKey, promise);
  }
  return svgCache.get(cacheKey);
}

export async function loadScacchiAsset(src, options, loadImage) {
  if (isArticoliSrc(src)) {
    return loadArticoliAsset(src, options.color, loadImage);
  }
  if (isPoesieSrc(src)) {
    return loadPoesieAsset(src, options.color, loadImage);
  }
  if (isStemmiSrc(src)) {
    return loadStemmiAsset(src, options.color, options.stemmiStrokeWeight ?? 100, loadImage);
  }
  if (isNecropoliFamilySrc(src)) {
    return loadNecropoliAsset(src, options.color, loadImage);
  }
  if (isScacchiComplessiSrc(src)) {
    return loadScacchiComplessiAsset(src, options.color, loadImage);
  }
  if (options.outline && isScacchiSrc(src)) {
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

export function getPoesieGapPx(format) {
  const W = format.widthPx;
  const H = format.heightPx;
  const { cols, rows } = format.grid;

  const gridAreaW = W * 0.9;
  const gridAreaH = H * 0.82;
  const cellMin = Math.min(gridAreaW / cols, gridAreaH / rows);

  return Math.max(16, Math.round(cellMin * 0.12));
}

export function getVectorGapPx(format, selectedCategories) {
  const gaps = [];
  if (hasChessLikeCategory(selectedCategories)) gaps.push(getScacchiGapPx(format));
  if (hasStemmiCategory(selectedCategories)) gaps.push(getScacchiGapPx(format));
  if (hasPoesieCategory(selectedCategories)) gaps.push(getPoesieGapPx(format));
  if (!gaps.length) return null;
  return Math.max(...gaps);
}

export const SCACCHI_FIT_SCALE = 0.8;
export const SCACCHI_FIT_SCALE_MIXED = 0.68;
export const SCACCHI_OUTLINE_FIT_FACTOR = 0.9;

export const POESIE_FIT_SCALE = 0.88;
export const POESIE_FIT_SCALE_MIXED = 0.72;
export const STEMMI_FIT_SCALE = 0.82;
export const STEMMI_FIT_SCALE_MIXED = 0.68;
export const ARTICOLI_FIT_SCALE = 0.92;
export const ARTICOLI_FIT_SCALE_MIXED = 0.78;

export function getScacchiFitScale(scacchiOnly, outline = false) {
  const base = scacchiOnly ? SCACCHI_FIT_SCALE : SCACCHI_FIT_SCALE_MIXED;
  return outline ? base * SCACCHI_OUTLINE_FIT_FACTOR : base;
}

export function getVectorFitScale(selectedCategories, outline = false) {
  if (isArticoliOnly(selectedCategories)) return ARTICOLI_FIT_SCALE;
  if (isPoesieOnly(selectedCategories)) return POESIE_FIT_SCALE;
  if (isStemmiOnly(selectedCategories)) return STEMMI_FIT_SCALE;
  if (isScacchiOnly(selectedCategories)) return getScacchiFitScale(true, outline);
  if (isScacchiComplessiOnly(selectedCategories)) return getScacchiFitScale(true, outline);
  if (hasVectorCategory(selectedCategories) && !isMultiCategorySet(selectedCategories)) {
    const id = [...selectedCategories][0];
    if (id === 'necropoli' || id === 'necropolilogo') return 1;
    if (id === 'articoli') return ARTICOLI_FIT_SCALE;
    if (id === 'poesie') return POESIE_FIT_SCALE;
    if (id === 'stemmi') return STEMMI_FIT_SCALE;
    if (id === 'scacchi' || id === 'scacchicomplessi') return getScacchiFitScale(true, outline);
  }
  if (hasChessLikeCategory(selectedCategories)) {
    return getScacchiFitScale(false, outline);
  }
  if (hasStemmiCategory(selectedCategories)) {
    return STEMMI_FIT_SCALE_MIXED;
  }
  if (hasPoesieCategory(selectedCategories)) {
    return POESIE_FIT_SCALE_MIXED;
  }
  if (hasArticoliCategory(selectedCategories)) {
    return ARTICOLI_FIT_SCALE_MIXED;
  }
  return 1;
}

function isMultiCategorySet(selectedCategories) {
  return selectedCategories.size > 1;
}

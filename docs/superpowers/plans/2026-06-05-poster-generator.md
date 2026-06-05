# Poster Generator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a single-page poster generator that composes random image grids from `immagini/` categories and exports PNG/JPG (300 dpi) and PDF.

**Architecture:** Vite serves a vanilla HTML/CSS/JS app. A Node manifest script scans `immagini/` subfolders at dev/build time so new categories appear automatically. Pure layout/sampling logic lives in testable modules; a Canvas 2D renderer draws preview and export at the correct pixel dimensions. UI is a split panel: controls left, scaled preview right.

**Tech Stack:** Vite 6, Vitest, Canvas 2D API, jsPDF 2.x, Node ESM scripts

---

## File Map

| File | Responsibility |
|------|----------------|
| `package.json` | Dependencies, scripts (`dev`, `build`, `test`, `manifest`) |
| `vite.config.js` | Vite + Vitest config |
| `index.html` | App shell, control markup, preview container |
| `scripts/generate-manifest.mjs` | Scan `immagini/` → `public/manifest.json` |
| `public/manifest.json` | Generated category/image index (gitignored or committed) |
| `src/config/formats.js` | Format definitions: dimensions, grid, dpi |
| `src/lib/sampler.js` | Random image selection with pool repetition |
| `src/lib/layout.js` | Margin, gap, cell, footer band geometry |
| `src/lib/renderer.js` | Draw poster to canvas (grid, footer, logo, text) |
| `src/export/png.js` | Trigger high-res PNG/JPG download |
| `src/export/pdf.js` | Build PDF from canvas via jsPDF |
| `src/styles.css` | Minimal UI (`#1a1a1a`, split layout) |
| `src/main.js` | Wire controls → generate → preview → export |
| `tests/formats.test.js` | Format config assertions |
| `tests/sampler.test.js` | Random sampling behavior |
| `tests/layout.test.js` | Layout math assertions |

---

### Task 1: Project Scaffold

**Files:**
- Create: `package.json`
- Create: `vite.config.js`
- Create: `.gitignore`

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "poster-generator",
  "private": true,
  "type": "module",
  "scripts": {
    "manifest": "node scripts/generate-manifest.mjs",
    "dev": "npm run manifest && vite",
    "build": "npm run manifest && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "devDependencies": {
    "vite": "^6.3.5",
    "vitest": "^3.2.4"
  },
  "dependencies": {
    "jspdf": "^2.5.2"
  }
}
```

- [ ] **Step 2: Create `vite.config.js`**

```javascript
import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  publicDir: 'public',
  test: {
    environment: 'node',
  },
});
```

- [ ] **Step 3: Create `.gitignore`**

```
node_modules/
dist/
.DS_Store
```

- [ ] **Step 4: Install dependencies**

Run: `npm install`
Expected: `added N packages` with no errors

- [ ] **Step 5: Commit**

```bash
git add package.json vite.config.js .gitignore package-lock.json
git commit -m "chore: scaffold vite project for poster generator"
```

---

### Task 2: Format Configuration

**Files:**
- Create: `src/config/formats.js`
- Create: `tests/formats.test.js`

- [ ] **Step 1: Write the failing test**

```javascript
// tests/formats.test.js
import { describe, it, expect } from 'vitest';
import { FORMATS, mmToPx, getFormat } from '../src/config/formats.js';

describe('formats', () => {
  it('defines all five formats with grid density from spec', () => {
    expect(FORMATS['a4-verticale'].grid).toEqual({ cols: 5, rows: 7 });
    expect(FORMATS['a4-orizzontale'].grid).toEqual({ cols: 7, rows: 5 });
    expect(FORMATS['a3-verticale'].grid).toEqual({ cols: 6, rows: 9 });
    expect(FORMATS['a3-orizzontale'].grid).toEqual({ cols: 9, rows: 6 });
    expect(FORMATS['web'].grid).toEqual({ cols: 5, rows: 5 });
  });

  it('converts mm to px at 300 dpi', () => {
    expect(mmToPx(210)).toBe(Math.round((210 * 300) / 25.4));
  });

  it('returns pixel dimensions for print formats', () => {
    const fmt = getFormat('a4-verticale');
    expect(fmt.widthPx).toBe(mmToPx(210));
    expect(fmt.heightPx).toBe(mmToPx(297));
  });

  it('uses 16:9 for web format', () => {
    const fmt = getFormat('web');
    expect(fmt.widthPx / fmt.heightPx).toBeCloseTo(16 / 9, 2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `Cannot find module '../src/config/formats.js'`

- [ ] **Step 3: Implement `src/config/formats.js`**

```javascript
const DPI = 300;

export function mmToPx(mm) {
  return Math.round((mm * DPI) / 25.4);
}

const PRINT_FORMATS = {
  'a4-verticale': { widthMm: 210, heightMm: 297, grid: { cols: 5, rows: 7 } },
  'a4-orizzontale': { widthMm: 297, heightMm: 210, grid: { cols: 7, rows: 5 } },
  'a3-verticale': { widthMm: 297, heightMm: 420, grid: { cols: 6, rows: 9 } },
  'a3-orizzontale': { widthMm: 420, heightMm: 297, grid: { cols: 9, rows: 6 } },
};

// Web: 16:9 at a screen-friendly base width
const WEB_BASE_WIDTH = 1920;

export const FORMATS = {
  ...Object.fromEntries(
    Object.entries(PRINT_FORMATS).map(([key, f]) => [
      key,
      {
        id: key,
        label: key.replace('-', ' ').replace('verticale', '↕').replace('orizzontale', '↔'),
        widthPx: mmToPx(f.widthMm),
        heightPx: mmToPx(f.heightMm),
        widthMm: f.widthMm,
        heightMm: f.heightMm,
        grid: f.grid,
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
    grid: { cols: 5, rows: 5 },
    dpi: DPI,
    isPrint: false,
  },
};

export function getFormat(id) {
  const format = FORMATS[id];
  if (!format) throw new Error(`Unknown format: ${id}`);
  return format;
}

export function getCellCount(formatId) {
  const { grid } = getFormat(formatId);
  return grid.cols * grid.rows;
}

export function formatExportSlug(formatId) {
  return formatId.replace(/-/g, '-');
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/config/formats.js tests/formats.test.js
git commit -m "feat: add format configuration with grid density and dpi conversion"
```

---

### Task 3: Category Manifest Generator

**Files:**
- Create: `scripts/generate-manifest.mjs`
- Create: `public/.gitkeep`

- [ ] **Step 1: Create `scripts/generate-manifest.mjs`**

```javascript
import { readdir, writeFile, symlink, rm, mkdir } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const IMMAGINI = join(ROOT, 'immagini');
const PUBLIC = join(ROOT, 'public');
const OUT = join(PUBLIC, 'manifest.json');
const IMAGE_EXT = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg']);

async function listImages(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  return entries
    .filter((e) => e.isFile() && IMAGE_EXT.has(extname(e.name).toLowerCase()))
    .map((e) => e.name)
    .sort();
}

async function linkStaticAssets() {
  await mkdir(PUBLIC, { recursive: true });
  const linkPath = join(PUBLIC, 'immagini');
  await rm(linkPath, { recursive: true, force: true });
  await symlink(IMMAGINI, linkPath, 'junction');
}

async function main() {
  await linkStaticAssets();

  const entries = await readdir(IMMAGINI, { withFileTypes: true });
  const categories = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const images = await listImages(join(IMMAGINI, entry.name));
    categories.push({
      id: entry.name,
      label: entry.name.charAt(0).toUpperCase() + entry.name.slice(1),
      images: images.map((name) => `/immagini/${entry.name}/${name}`),
    });
  }

  categories.sort((a, b) => a.id.localeCompare(b.id));

  const manifest = {
    logo: '/immagini/logo.svg',
    categories,
    generatedAt: new Date().toISOString(),
  };

  await writeFile(OUT, JSON.stringify(manifest, null, 2), 'utf8');
  console.log(`Wrote ${categories.length} categories to public/manifest.json`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

- [ ] **Step 2: Update `vite.config.js`**

```javascript
import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  publicDir: 'public',
  server: {
    fs: { allow: ['.'] },
  },
  test: { environment: 'node' },
});
```

- [ ] **Step 3: Run manifest generator**

Run: `npm run manifest`
Expected: `Wrote 1 categories to public/manifest.json`

- [ ] **Step 4: Verify manifest content**

Run: `node -e "import m from './public/manifest.json' assert {type:'json'}; console.log(m.categories[0].id)"`
Expected: `disegni`

- [ ] **Step 5: Commit**

```bash
git add scripts/generate-manifest.mjs public/manifest.json vite.config.js
git commit -m "feat: auto-generate category manifest from immagini subfolders"
```

---

### Task 4: Random Sampler

**Files:**
- Create: `src/lib/sampler.js`
- Create: `tests/sampler.test.js`

- [ ] **Step 1: Write the failing test**

```javascript
// tests/sampler.test.js
import { describe, it, expect, vi } from 'vitest';
import { buildImagePool, sampleImages } from '../src/lib/sampler.js';

describe('sampler', () => {
  const manifest = {
    categories: [
      { id: 'disegni', images: ['/immagini/disegni/a.png', '/immagini/disegni/b.png'] },
      { id: 'foto', images: ['/immagini/foto/c.png'] },
    ],
  };

  it('buildImagePool merges selected categories', () => {
    const pool = buildImagePool(manifest, ['disegni', 'foto']);
    expect(pool).toHaveLength(3);
  });

  it('buildImagePool returns empty for no selection', () => {
    expect(buildImagePool(manifest, [])).toEqual([]);
  });

  it('sampleImages returns exact count', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.1);
    const result = sampleImages(['a', 'b'], 5);
    expect(result).toHaveLength(5);
    Math.random.mockRestore();
  });

  it('sampleImages repeats when pool is smaller than count', () => {
    const result = sampleImages(['only'], 4);
    expect(result).toHaveLength(4);
    expect(result.every((x) => x === 'only')).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/sampler.test.js`
Expected: FAIL — module not found

- [ ] **Step 3: Implement `src/lib/sampler.js`**

```javascript
export function buildImagePool(manifest, selectedCategoryIds) {
  if (!selectedCategoryIds.length) return [];
  const idSet = new Set(selectedCategoryIds);
  return manifest.categories
    .filter((c) => idSet.has(c.id) && c.images.length > 0)
    .flatMap((c) => c.images);
}

export function sampleImages(pool, count) {
  if (!pool.length) return [];
  const result = [];
  for (let i = 0; i < count; i++) {
    const index = Math.floor(Math.random() * pool.length);
    result.push(pool[index]);
  }
  return result;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/sampler.test.js`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/sampler.js tests/sampler.test.js
git commit -m "feat: add random image sampler with pool repetition"
```

---

### Task 5: Layout Geometry

**Files:**
- Create: `src/lib/layout.js`
- Create: `tests/layout.test.js`

- [ ] **Step 1: Write the failing test**

```javascript
// tests/layout.test.js
import { describe, it, expect } from 'vitest';
import { computeLayout } from '../src/lib/layout.js';

describe('layout', () => {
  const format = { widthPx: 1000, heightPx: 1414, grid: { cols: 5, rows: 7 } };

  it('reserves a larger bottom band than side margins', () => {
    const layout = computeLayout(format);
    expect(layout.footer.height).toBeGreaterThan(layout.margin.top);
    expect(layout.footer.height).toBeGreaterThan(layout.margin.left);
  });

  it('returns non-overlapping grid and footer rects', () => {
    const layout = computeLayout(format);
    const gridBottom = layout.grid.y + layout.grid.height;
    expect(gridBottom).toBeLessThanOrEqual(layout.footer.y);
  });

  it('produces equal cell sizes with medium gap', () => {
    const layout = computeLayout(format);
    expect(layout.cells).toHaveLength(35);
    const first = layout.cells[0];
    const second = layout.cells[1];
    expect(first.width).toBe(second.width);
    expect(first.height).toBe(second.height);
    expect(layout.gap).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/layout.test.js`
Expected: FAIL

- [ ] **Step 3: Implement `src/lib/layout.js`**

```javascript
const MARGIN_SIDE_RATIO = 0.05;
const MARGIN_TOP_RATIO = 0.05;
const MARGIN_BOTTOM_RATIO = 0.12;
const GAP_RATIO = 0.012;

export function computeLayout(format) {
  const { widthPx: W, heightPx: H, grid } = format;

  const margin = {
    left: Math.round(W * MARGIN_SIDE_RATIO),
    right: Math.round(W * MARGIN_SIDE_RATIO),
    top: Math.round(H * MARGIN_TOP_RATIO),
    bottom: Math.round(H * MARGIN_BOTTOM_RATIO),
  };

  const footerHeight = margin.bottom;
  const footer = {
    x: margin.left,
    y: H - footerHeight,
    width: W - margin.left - margin.right,
    height: footerHeight,
  };

  const gridArea = {
    x: margin.left,
    y: margin.top,
    width: W - margin.left - margin.right,
    height: footer.y - margin.top,
  };

  const gap = Math.round(gridArea.width * GAP_RATIO);
  const cellWidth = Math.floor((gridArea.width - gap * (grid.cols - 1)) / grid.cols);
  const cellHeight = Math.floor((gridArea.height - gap * (grid.rows - 1)) / grid.rows);

  const cells = [];
  for (let row = 0; row < grid.rows; row++) {
    for (let col = 0; col < grid.cols; col++) {
      cells.push({
        x: gridArea.x + col * (cellWidth + gap),
        y: gridArea.y + row * (cellHeight + gap),
        width: cellWidth,
        height: cellHeight,
      });
    }
  }

  return {
    width: W,
    height: H,
    margin,
    gap,
    grid: gridArea,
    footer,
    cells,
    logo: {
      maxHeight: Math.round(footerHeight * 0.55),
      paddingRight: Math.round(margin.right * 0.5),
      paddingBottom: Math.round(footerHeight * 0.15),
    },
    description: {
      paddingLeft: 0,
      paddingBottom: Math.round(footerHeight * 0.2),
      fontSize: Math.round(footerHeight * 0.22),
      maxWidth: Math.round(footer.width * 0.6),
    },
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/layout.test.js`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/layout.js tests/layout.test.js
git commit -m "feat: add poster layout geometry with margins and footer band"
```

---

### Task 6: Canvas Renderer

**Files:**
- Create: `src/lib/renderer.js`

- [ ] **Step 1: Implement image loader helper**

```javascript
// src/lib/renderer.js
const imageCache = new Map();

export function loadImage(src) {
  if (imageCache.has(src)) return imageCache.get(src);
  const promise = new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load: ${src}`));
    img.src = src;
  });
  imageCache.set(src, promise);
  return promise;
}

function drawContainedImage(ctx, img, cell, bgColor) {
  ctx.fillStyle = bgColor;
  ctx.fillRect(cell.x, cell.y, cell.width, cell.height);

  const scale = Math.min(cell.width / img.width, cell.height / img.height);
  const w = img.width * scale;
  const h = img.height * scale;
  const x = cell.x + (cell.width - w) / 2;
  const y = cell.y + (cell.height - h) / 2;
  ctx.drawImage(img, x, y, w, h);
}

function drawFooter(ctx, layout, { description, logoSrc, bgColor }) {
  const { footer, logo, description: descStyle } = layout;

  if (description) {
    ctx.fillStyle = '#1a1a1a';
    ctx.font = `${descStyle.fontSize}px sans-serif`;
    ctx.textBaseline = 'bottom';
    const textY = footer.y + footer.height - descStyle.paddingBottom;
    ctx.fillText(description, footer.x, textY, descStyle.maxWidth);
  }

  return loadImage(logoSrc).then((logoImg) => {
    const maxH = logo.maxHeight;
    const scale = maxH / logoImg.height;
    const w = logoImg.width * scale;
    const h = logoImg.height * scale;
    const x = footer.x + footer.width - w - logo.paddingRight;
    const y = footer.y + footer.height - h - logo.paddingBottom;
    ctx.drawImage(logoImg, x, y, w, h);
  });
}

export async function renderPoster(canvas, format, layout, imageSrcs, options) {
  const { backgroundColor, description, logoSrc } = options;
  canvas.width = format.widthPx;
  canvas.height = format.heightPx;

  const ctx = canvas.getContext('2d');
  ctx.fillStyle = backgroundColor;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const images = await Promise.all(imageSrcs.map(loadImage));
  layout.cells.forEach((cell, i) => {
    if (images[i]) drawContainedImage(ctx, images[i], cell, backgroundColor);
  });

  await drawFooter(ctx, layout, { description, logoSrc, bgColor: backgroundColor });
  return canvas;
}
```

- [ ] **Step 2: Manual smoke test via browser console** (after Task 7 wires preview)

Deferred until UI exists — verified in Task 9.

- [ ] **Step 3: Commit**

```bash
git add src/lib/renderer.js
git commit -m "feat: add canvas poster renderer with contained images and footer"
```

---

### Task 7: UI Shell and Controls

**Files:**
- Create: `index.html`
- Create: `src/styles.css`
- Create: `src/main.js`

- [ ] **Step 1: Create `index.html`**

```html
<!DOCTYPE html>
<html lang="it">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Poster Generator</title>
    <link rel="stylesheet" href="/src/styles.css" />
  </head>
  <body>
    <div class="app">
      <aside class="controls">
        <h1>Poster Generator</h1>

        <section>
          <h2>Categorie</h2>
          <div id="categories" class="checkbox-group"></div>
        </section>

        <section>
          <h2>Formato</h2>
          <div id="formats" class="radio-group"></div>
        </section>

        <section>
          <h2>Sfondo</h2>
          <input type="color" id="background" value="#ffffff" />
        </section>

        <section>
          <h2>Descrizione</h2>
          <textarea id="description" rows="3" placeholder="Testo libero (opzionale)"></textarea>
        </section>

        <div class="actions">
          <button id="generate" disabled>Genera</button>
          <button id="regenerate" disabled>Rigenera</button>
        </div>

        <section>
          <h2>Esporta</h2>
          <div class="export-group">
            <button id="export-png" disabled>PNG</button>
            <button id="export-jpg" disabled>JPG</button>
            <button id="export-pdf" disabled>PDF</button>
          </div>
        </section>
      </aside>

      <main class="preview-panel">
        <div class="preview-frame">
          <canvas id="preview"></canvas>
        </div>
      </main>
    </div>
    <script type="module" src="/src/main.js"></script>
  </body>
</html>
```

- [ ] **Step 2: Create `src/styles.css`**

```css
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

body {
  font-family: system-ui, sans-serif;
  color: #1a1a1a;
  background: #fff;
}

.app {
  display: grid;
  grid-template-columns: 320px 1fr;
  min-height: 100vh;
}

.controls {
  padding: 2rem;
  border-right: 1px solid #e5e5e5;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.controls h1 { font-size: 1.25rem; font-weight: 500; }
.controls h2 { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; color: #666; margin-bottom: 0.5rem; }

.checkbox-group, .radio-group { display: flex; flex-direction: column; gap: 0.5rem; }

label { display: flex; align-items: center; gap: 0.5rem; cursor: pointer; font-size: 0.9rem; }
label.disabled { opacity: 0.4; cursor: not-allowed; }

textarea {
  width: 100%;
  border: 1px solid #ccc;
  padding: 0.5rem;
  font-family: inherit;
  font-size: 0.9rem;
  resize: vertical;
}

button {
  background: #1a1a1a;
  color: #fff;
  border: none;
  padding: 0.6rem 1.2rem;
  font-size: 0.85rem;
  cursor: pointer;
}

button:disabled { opacity: 0.3; cursor: not-allowed; }

.actions, .export-group { display: flex; gap: 0.5rem; flex-wrap: wrap; }

.preview-panel {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  background: #f7f7f7;
}

.preview-frame {
  max-width: 100%;
  max-height: calc(100vh - 4rem);
  box-shadow: 0 2px 20px rgba(0,0,0,0.08);
}

#preview {
  display: block;
  max-width: 100%;
  max-height: calc(100vh - 4rem);
  width: auto;
  height: auto;
}
```

- [ ] **Step 3: Create `src/main.js`**

```javascript
import { FORMATS, getFormat, getCellCount } from './config/formats.js';
import { buildImagePool, sampleImages } from './lib/sampler.js';
import { computeLayout } from './lib/layout.js';
import { renderPoster } from './lib/renderer.js';
import { downloadPng, downloadJpg } from './export/png.js';
import { downloadPdf } from './export/pdf.js';

const state = {
  manifest: null,
  formatId: 'a4-verticale',
  selectedCategories: new Set(),
  backgroundColor: '#ffffff',
  description: '',
  imageSrcs: [],
  hasGenerated: false,
};

const els = {
  categories: document.getElementById('categories'),
  formats: document.getElementById('formats'),
  background: document.getElementById('background'),
  description: document.getElementById('description'),
  generate: document.getElementById('generate'),
  regenerate: document.getElementById('regenerate'),
  exportPng: document.getElementById('export-png'),
  exportJpg: document.getElementById('export-jpg'),
  exportPdf: document.getElementById('export-pdf'),
  preview: document.getElementById('preview'),
};

function updateButtons() {
  const hasCategories = state.selectedCategories.size > 0;
  els.generate.disabled = !hasCategories;
  els.regenerate.disabled = !state.hasGenerated;
  els.exportPng.disabled = !state.hasGenerated;
  els.exportJpg.disabled = !state.hasGenerated;
  els.exportPdf.disabled = !state.hasGenerated;
}

function renderCategoryControls() {
  els.categories.innerHTML = '';
  for (const cat of state.manifest.categories) {
    const empty = cat.images.length === 0;
    const label = document.createElement('label');
    if (empty) label.classList.add('disabled');

    const input = document.createElement('input');
    input.type = 'checkbox';
    input.value = cat.id;
    input.disabled = empty;
    input.addEventListener('change', () => {
      if (input.checked) state.selectedCategories.add(cat.id);
      else state.selectedCategories.delete(cat.id);
      updateButtons();
    });

    label.append(input, document.createTextNode(empty ? `${cat.label} (vuota)` : cat.label));
    els.categories.append(label);
  }
}

function renderFormatControls() {
  els.formats.innerHTML = '';
  for (const [id, fmt] of Object.entries(FORMATS)) {
    const label = document.createElement('label');
    const input = document.createElement('input');
    input.type = 'radio';
    input.name = 'format';
    input.value = id;
    input.checked = id === state.formatId;
    input.addEventListener('change', () => { state.formatId = id; });
    label.append(input, document.createTextNode(fmt.label));
    els.formats.append(label);
  }
}

async function generatePoster() {
  const format = getFormat(state.formatId);
  const pool = buildImagePool(state.manifest, [...state.selectedCategories]);
  const count = getCellCount(state.formatId);
  state.imageSrcs = sampleImages(pool, count);
  const layout = computeLayout(format);

  await renderPoster(els.preview, format, layout, state.imageSrcs, {
    backgroundColor: state.backgroundColor,
    description: state.description,
    logoSrc: state.manifest.logo,
  });

  state.hasGenerated = true;
  updateButtons();
}

async function init() {
  const res = await fetch('/manifest.json');
  state.manifest = await res.json();
  renderCategoryControls();
  renderFormatControls();

  els.background.addEventListener('input', (e) => { state.backgroundColor = e.target.value; });
  els.description.addEventListener('input', (e) => { state.description = e.target.value; });
  els.generate.addEventListener('click', generatePoster);
  els.regenerate.addEventListener('click', generatePoster);
  els.exportPng.addEventListener('click', () => downloadPng(els.preview, state.formatId));
  els.exportJpg.addEventListener('click', () => downloadJpg(els.preview, state.formatId));
  els.exportPdf.addEventListener('click', () => downloadPdf(els.preview, state.formatId, getFormat(state.formatId)));

  updateButtons();
}

init();
```

- [ ] **Step 4: Run dev server and verify UI**

Run: `npm run dev`
Open: `http://localhost:5173`
Expected: Split layout, "Disegni" checkbox, format radios, disabled Genera until category selected

- [ ] **Step 5: Commit**

```bash
git add index.html src/styles.css src/main.js
git commit -m "feat: add split-panel UI with category and format controls"
```

---

### Task 8: PNG and JPG Export

**Files:**
- Create: `src/export/png.js`

- [ ] **Step 1: Implement export helpers**

```javascript
// src/export/png.js
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
```

- [ ] **Step 2: Manual test**

1. `npm run dev`
2. Select Disegni → Genera → Export PNG
Expected: Downloads `poster-a4-verticale-YYYY-MM-DD.png` at full 300 dpi resolution (check image dimensions: 2480×3508 for A4 vertical)

- [ ] **Step 3: Commit**

```bash
git add src/export/png.js
git commit -m "feat: add PNG and JPG export at canvas resolution"
```

---

### Task 9: PDF Export

**Files:**
- Create: `src/export/pdf.js`

- [ ] **Step 1: Implement PDF export**

```javascript
// src/export/pdf.js
import { jsPDF } from 'jspdf';

function exportFilename(formatId) {
  const date = new Date().toISOString().slice(0, 10);
  return `poster-${formatId}-${date}.pdf`;
}

export function downloadPdf(canvas, formatId, format) {
  const imgData = canvas.toDataURL('image/jpeg', 0.95);

  const orientation = format.widthPx >= format.heightPx ? 'landscape' : 'portrait';
  const widthMm = format.widthMm ?? (format.widthPx * 25.4) / 300;
  const heightMm = format.heightMm ?? (format.heightPx * 25.4) / 300;

  const pdf = new jsPDF({
    orientation,
    unit: 'mm',
    format: format.isPrint ? [widthMm, heightMm] : [widthMm, heightMm],
  });

  pdf.addImage(imgData, 'JPEG', 0, 0, widthMm, heightMm);
  pdf.save(exportFilename(formatId));
}
```

- [ ] **Step 2: Manual test**

1. Generate poster → Export PDF
Expected: PDF opens with correct aspect ratio and full composition

- [ ] **Step 3: Commit**

```bash
git add src/export/pdf.js
git commit -m "feat: add PDF export via jsPDF"
```

---

### Task 10: Integration Verification

**Files:** none (manual QA against spec testing checklist)

- [ ] **Step 1: Run all unit tests**

Run: `npm test`
Expected: All tests PASS

- [ ] **Step 2: Run spec testing checklist manually**

| Check | How to verify |
|-------|---------------|
| Each format correct grid | Generate with each format, count cells visually |
| Mixed categories | Check two categories when second folder exists |
| Images contained | No cropping; bands visible on non-square images |
| Footer layout | Description left, logo right, grid not overlapping |
| Rigenera | Click Rigenera, grid images change |
| Export 300 dpi | A4 vertical PNG = 2480×3508 px |
| PDF fidelity | Matches preview composition |
| New category auto | Add `immagini/foto/` with images, run `npm run manifest`, refresh |
| Genera disabled | No category → button disabled |

- [ ] **Step 3: Production build**

Run: `npm run build`
Expected: `dist/` created with no errors

- [ ] **Step 4: Final commit if any fixes**

```bash
git add -A
git commit -m "fix: integration fixes from manual QA"
```

---

## Spec Coverage Map

| Spec requirement | Task |
|-----------------|------|
| Split-panel UI | Task 7 |
| Category checkboxes from subfolders | Task 3, 7 |
| Five formats with dense grid | Task 2 |
| Random sample + repetition | Task 4 |
| Uniform grid, medium gap | Task 5 |
| Contained images | Task 6 |
| Margins + footer band | Task 5, 6 |
| Description left, logo right | Task 6 |
| Genera / Rigenera behavior | Task 7 |
| PNG/JPG 300 dpi | Task 2, 8 |
| PDF export | Task 9 |
| Web 16:9 format | Task 2 |
| UI style #1a1a1a minimal | Task 7 |
| Empty category disabled | Task 7 |
| Genera disabled without selection | Task 7 |

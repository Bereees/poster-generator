import { FORMATS, getFormat } from './formats.js';
import { GRIDS, getGrid, getCellCount } from './grids.js';
import { buildImagePool, sampleImages } from './sampler.js';
import { computeLayout } from './layout.js';
import { renderPoster } from './renderer.js';
import { downloadPng, downloadJpg, downloadPdf } from './export.js';
import { initThemeToggle } from './theme.js';
import { isScacchiOnly, getScacchiGapPx } from './scacchi.js';

const state = {
  manifest: null,
  formatId: 'a4-verticale',
  gridId: '5x7',
  selectedCategories: new Set(),
  backgroundColor: '#ffffff',
  tintEnabled: false,
  tintColor: '#c0392b',
  adaptiveFooter: false,
  description: '',
  randomRotation: false,
  scacchiOutline: true,
  scacchiColor: '#1a1a1a',
  scacchiStrokeWeight: 50,
  imageSrcs: [],
  imageRotations: [],
  hasGenerated: false,
};

const els = {
  categories: document.getElementById('categories'),
  categoriesSelection: document.getElementById('categories-selection'),
  formats: document.getElementById('formats'),
  formatSelection: document.getElementById('format-selection'),
  grids: document.getElementById('grids'),
  gridSelection: document.getElementById('grid-selection'),
  background: document.getElementById('background'),
  tintEnabled: document.getElementById('tint-enabled'),
  tintColor: document.getElementById('tint-color'),
  adaptiveFooter: document.getElementById('adaptive-footer'),
  description: document.getElementById('description'),
  randomRotation: document.getElementById('random-rotation'),
  generate: document.getElementById('generate'),
  regenerate: document.getElementById('regenerate'),
  exportPng: document.getElementById('export-png'),
  exportJpg: document.getElementById('export-jpg'),
  exportPdf: document.getElementById('export-pdf'),
  preview: document.getElementById('preview'),
  loadingSpinner: document.getElementById('loading-spinner'),
  themeToggle: document.getElementById('theme-toggle'),
  scacchiOptions: document.getElementById('scacchi-options'),
  scacchiOutline: document.getElementById('scacchi-outline'),
  scacchiColor: document.getElementById('scacchi-color'),
  scacchiStroke: document.getElementById('scacchi-stroke'),
  scacchiStrokeValue: document.getElementById('scacchi-stroke-value'),
  scacchiStrokeField: document.getElementById('scacchi-stroke-field'),
  tintSection: document.querySelector('#tint-enabled')?.closest('.color-field'),
};

function setLoading(isLoading) {
  els.loadingSpinner.hidden = !isLoading;
  if (isLoading) {
    els.generate.disabled = true;
    els.regenerate.disabled = true;
  } else {
    updateButtons();
  }
}

function updateButtons() {
  const hasCategories = state.selectedCategories.size > 0;
  els.generate.disabled = !hasCategories;
  els.regenerate.disabled = !state.hasGenerated;
  els.exportPng.disabled = !state.hasGenerated;
  els.exportJpg.disabled = !state.hasGenerated;
  els.exportPdf.disabled = !state.hasGenerated;
}

function updateCategoriesSummary() {
  if (!state.selectedCategories.size) {
    els.categoriesSelection.textContent = 'Nessuna';
    return;
  }

  const labels = state.manifest.categories
    .filter((cat) => state.selectedCategories.has(cat.id))
    .map((cat) => cat.label);
  els.categoriesSelection.textContent = labels.join(', ');
}

function updateFormatSummary() {
  els.formatSelection.textContent = getFormat(state.formatId).label;
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
      updateCategoriesSummary();
      updateScacchiOptionsVisibility();
      updateButtons();
      refreshPoster();
    });

    label.append(input, document.createTextNode(empty ? `${cat.label} (vuota)` : cat.label));
    els.categories.append(label);
  }
  updateCategoriesSummary();
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
    input.addEventListener('change', () => {
      state.formatId = id;
      updateFormatSummary();
      refreshPoster();
    });
    label.append(input, document.createTextNode(fmt.label));
    els.formats.append(label);
  }
  updateFormatSummary();
}

function updateGridSummary() {
  els.gridSelection.textContent = getGrid(state.gridId).label;
}

function renderGridControls() {
  els.grids.innerHTML = '';
  for (const [id, grid] of Object.entries(GRIDS)) {
    const label = document.createElement('label');
    const input = document.createElement('input');
    input.type = 'radio';
    input.name = 'grid';
    input.value = id;
    input.checked = id === state.gridId;
    input.addEventListener('change', () => {
      state.gridId = id;
      updateGridSummary();
      refreshPoster();
    });
    label.append(input, document.createTextNode(grid.label));
    els.grids.append(label);
  }
  updateGridSummary();
}

function getPosterFormat() {
  return { ...getFormat(state.formatId), grid: getGrid(state.gridId) };
}

function updateScacchiOptionsVisibility() {
  const scacchiOnly = isScacchiOnly(state.selectedCategories);
  els.scacchiOptions.hidden = !scacchiOnly;
  if (els.tintSection) els.tintSection.hidden = scacchiOnly;
  if (scacchiOnly) {
    els.scacchiStrokeField.hidden = !state.scacchiOutline;
  }
}

function getLayoutOptions() {
  const format = getPosterFormat();
  if (!isScacchiOnly(state.selectedCategories)) return {};
  return { gapPx: getScacchiGapPx(format) };
}

function getScacchiRenderOptions() {
  if (!isScacchiOnly(state.selectedCategories)) return null;
  return {
    outline: state.scacchiOutline,
    color: state.scacchiColor,
    strokeWeight: state.scacchiStrokeWeight,
  };
}

function getRenderOptions() {
  const scacchiOnly = isScacchiOnly(state.selectedCategories);
  return {
    backgroundColor: state.backgroundColor,
    description: state.description,
    logoSrc: state.manifest.logo,
    rotations: state.imageRotations,
    tintColor: scacchiOnly || !state.tintEnabled ? null : state.tintColor,
    adaptiveFooter: state.adaptiveFooter,
    scacchi: getScacchiRenderOptions(),
  };
}

async function refreshPoster() {
  if (!state.hasGenerated) return;
  const format = getPosterFormat();
  const layout = computeLayout(format, getLayoutOptions());
  await renderPoster(els.preview, format, layout, state.imageSrcs, getRenderOptions());
}

let tintRefreshTimer;
let scacchiRefreshTimer;
function scheduleScacchiRefresh() {
  clearTimeout(scacchiRefreshTimer);
  scacchiRefreshTimer = setTimeout(() => refreshPoster(), 120);
}
function scheduleTintRefresh() {
  clearTimeout(tintRefreshTimer);
  tintRefreshTimer = setTimeout(() => refreshPoster(), 120);
}

async function generatePoster() {
  setLoading(true);
  try {
    const format = getPosterFormat();
    const pool = buildImagePool(state.manifest, [...state.selectedCategories]);
    const count = getCellCount(state.gridId);
    state.imageSrcs = sampleImages(pool, count);
    state.imageRotations = state.randomRotation
      ? state.imageSrcs.map(() => Math.random() * Math.PI * 2)
      : state.imageSrcs.map(() => 0);
    const layout = computeLayout(format, getLayoutOptions());

    await renderPoster(els.preview, format, layout, state.imageSrcs, getRenderOptions());

    state.hasGenerated = true;
  } finally {
    setLoading(false);
  }
}

function initCollapsibles() {
  document.querySelectorAll('[data-collapsible]').forEach((root) => {
    const trigger = root.querySelector('.collapsible-trigger');
    const panel = root.querySelector('.collapsible-panel');

    trigger.addEventListener('click', () => {
      const isOpen = root.classList.contains('is-open');
      root.classList.toggle('is-open', !isOpen);
      trigger.setAttribute('aria-expanded', String(!isOpen));
      panel.hidden = isOpen;
    });
  });
}

function reportError(err) {
  console.error(err);
  alert(err.message ?? 'Errore durante la generazione del poster.');
}

async function init() {
  const res = await fetch('manifest.json');
  if (!res.ok) throw new Error('manifest.json non trovato. Esegui: node scripts/generate-manifest.mjs');
  state.manifest = await res.json();

  renderCategoryControls();
  renderFormatControls();
  renderGridControls();
  initCollapsibles();
  initThemeToggle(els.themeToggle);

  els.background.addEventListener('input', (e) => {
    state.backgroundColor = e.target.value;
    refreshPoster();
  });
  els.tintEnabled.addEventListener('change', (e) => {
    state.tintEnabled = e.target.checked;
    els.tintColor.disabled = !state.tintEnabled;
    refreshPoster();
  });
  els.tintColor.addEventListener('input', (e) => {
    state.tintColor = e.target.value;
    if (state.tintEnabled) scheduleTintRefresh();
  });
  els.scacchiOutline.addEventListener('change', (e) => {
    state.scacchiOutline = e.target.checked;
    updateScacchiOptionsVisibility();
    refreshPoster();
  });
  els.scacchiColor.addEventListener('input', (e) => {
    state.scacchiColor = e.target.value;
    scheduleScacchiRefresh();
  });
  els.scacchiStroke.addEventListener('input', (e) => {
    state.scacchiStrokeWeight = Number(e.target.value);
    els.scacchiStrokeValue.textContent = String(state.scacchiStrokeWeight);
    if (state.scacchiOutline) scheduleScacchiRefresh();
  });
  els.adaptiveFooter.addEventListener('change', (e) => {
    state.adaptiveFooter = e.target.checked;
    refreshPoster();
  });
  els.description.addEventListener('input', (e) => {
    state.description = e.target.value;
    refreshPoster();
  });
  els.randomRotation.addEventListener('change', (e) => {
    state.randomRotation = e.target.checked;
  });
  els.generate.addEventListener('click', () => generatePoster().catch(reportError));
  els.regenerate.addEventListener('click', () => generatePoster().catch(reportError));
  els.exportPng.addEventListener('click', () => downloadPng(els.preview, state.formatId));
  els.exportJpg.addEventListener('click', () => downloadJpg(els.preview, state.formatId));
  els.exportPdf.addEventListener('click', () => downloadPdf(els.preview, state.formatId, getFormat(state.formatId)));

  updateButtons();
  updateScacchiOptionsVisibility();
}

init().catch((err) => {
  console.error(err);
  alert(err.message);
});

import { FORMATS, getFormat } from './formats.js';
import { GRIDS, getGrid, getCellCount } from './grids.js';
import { buildImagePool, sampleImages } from './sampler.js';
import { computeLayout } from './layout.js';
import { renderPoster } from './renderer.js';
import { downloadPng, downloadJpg, downloadPdf } from './export.js';
import { initThemeToggle } from './theme.js';
import { randomHexColors } from './colors.js';
import {
  isScacchiOnly,
  hasScacchiCategory,
  getScacchiGapPx,
  getScacchiFitScale,
} from './scacchi.js';

const state = {
  manifest: null,
  formatId: 'a4-verticale',
  gridId: '5x7',
  selectedCategories: new Set(),
  backgroundColor: '#ffffff',
  tintColor: '#1a1a1a',
  adaptiveFooter: false,
  description: '',
  randomRotation: false,
  scacchiOutline: true,
  scacchiColor: '#1a1a1a',
  scacchiStrokeWeight: 50,
  elementColor: '#1a1a1a',
  randomColorsEnabled: false,
  randomColors: null,
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
  scacchiColorSection: document.getElementById('scacchi-color-section'),
  scacchiOutlineOptions: document.getElementById('scacchi-outline-options'),
  scacchiOutline: document.getElementById('scacchi-outline'),
  scacchiColor: document.getElementById('scacchi-color'),
  elementColorSection: document.getElementById('element-color-section'),
  elementColor: document.getElementById('element-color'),
  scacchiStroke: document.getElementById('scacchi-stroke'),
  scacchiStrokeValue: document.getElementById('scacchi-stroke-value'),
  scacchiStrokeField: document.getElementById('scacchi-stroke-field'),
  tintSection: document.getElementById('tint-section'),
  randomColorsSection: document.getElementById('random-colors-section'),
  randomColors: document.getElementById('random-colors'),
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
      const wasMulti = isMultiCategory(state.selectedCategories);
      if (input.checked) state.selectedCategories.add(cat.id);
      else state.selectedCategories.delete(cat.id);
      syncUnifiedColorOnEnterMulti(wasMulti);
      clearRandomColors();
      updateCategoriesSummary();
      updateColorOptionsVisibility();
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

function hasDisegniCategory(selectedCategories) {
  return selectedCategories.has('disegni');
}

function isMultiCategory(selectedCategories) {
  return selectedCategories.size > 1;
}

function syncUnifiedColorOnEnterMulti(wasMulti) {
  if (wasMulti || !isMultiCategory(state.selectedCategories)) return;

  const hasScacchi = hasScacchiCategory(state.selectedCategories);
  const hasDisegni = hasDisegniCategory(state.selectedCategories);

  if (hasDisegni && !hasScacchi) {
    state.elementColor = state.tintColor;
  } else if (hasScacchi) {
    state.elementColor = state.scacchiColor;
  }

  els.elementColor.value = state.elementColor;
}

function updateColorOptionsVisibility() {
  const hasScacchi = hasScacchiCategory(state.selectedCategories);
  const hasDisegni = hasDisegniCategory(state.selectedCategories);
  const multi = isMultiCategory(state.selectedCategories);
  const scacchiOnly = isScacchiOnly(state.selectedCategories);
  const disegniOnly = state.selectedCategories.size === 1 && hasDisegni;

  els.elementColorSection.hidden = !multi;
  els.tintSection.hidden = multi || !disegniOnly;
  els.scacchiColorSection.hidden = multi || !scacchiOnly;
  els.scacchiOutlineOptions.hidden = !scacchiOnly;

  if (scacchiOnly) {
    els.scacchiStrokeField.hidden = !state.scacchiOutline;
  }

  const hasColorable = hasScacchi || hasDisegni;
  const randomOn = state.randomColorsEnabled;
  els.randomColorsSection.hidden = !hasColorable;

  els.tintColor.disabled = randomOn;
  els.scacchiColor.disabled = randomOn;
  els.elementColor.disabled = randomOn;
}

function clearRandomColors() {
  state.randomColorsEnabled = false;
  state.randomColors = null;
  els.randomColors.checked = false;
  updateColorOptionsVisibility();
}

function applyRandomImageColors() {
  state.randomColors = randomHexColors(state.imageSrcs.length);
}

function setRandomColorsEnabled(enabled) {
  state.randomColorsEnabled = enabled;
  if (enabled && state.hasGenerated) {
    applyRandomImageColors();
  } else if (!enabled) {
    state.randomColors = null;
  }
  updateColorOptionsVisibility();
  refreshPoster();
}

function getLayoutOptions() {
  const format = getPosterFormat();
  if (!hasScacchiCategory(state.selectedCategories)) return {};
  return { gapPx: getScacchiGapPx(format) };
}

function getScacchiRenderOptions() {
  if (!hasScacchiCategory(state.selectedCategories)) return null;
  const scacchiOnly = isScacchiOnly(state.selectedCategories);
  const multi = isMultiCategory(state.selectedCategories);
  return {
    outline: scacchiOnly && state.scacchiOutline,
    color: multi ? state.elementColor : state.scacchiColor,
    strokeWeight: state.scacchiStrokeWeight,
  };
}

function getRenderOptions() {
  const scacchiOnly = isScacchiOnly(state.selectedCategories);
  const hasScacchi = hasScacchiCategory(state.selectedCategories);
  const hasDisegni = hasDisegniCategory(state.selectedCategories);
  const multi = isMultiCategory(state.selectedCategories);

  let tintColor = null;
  if (multi && hasDisegni) {
    tintColor = state.elementColor;
  } else if (!hasScacchi && hasDisegni) {
    tintColor = state.tintColor;
  }

  return {
    backgroundColor: state.backgroundColor,
    description: state.description,
    logoSrc: state.manifest.logo,
    rotations: state.imageRotations,
    tintColor,
    adaptiveFooter: state.adaptiveFooter,
    scacchi: getScacchiRenderOptions(),
    scacchiFitScale: hasScacchi ? getScacchiFitScale(scacchiOnly) : 1,
    imageColors: state.randomColors,
  };
}

async function refreshPoster() {
  if (!state.hasGenerated) return;
  const format = getPosterFormat();
  const layout = computeLayout(format, getLayoutOptions());
  await renderPoster(els.preview, format, layout, state.imageSrcs, getRenderOptions());
}

let colorRefreshTimer;
function scheduleColorRefresh() {
  clearTimeout(colorRefreshTimer);
  colorRefreshTimer = setTimeout(() => refreshPoster(), 120);
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
    if (state.randomColorsEnabled) {
      applyRandomImageColors();
    }
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
  els.tintColor.addEventListener('input', (e) => {
    state.tintColor = e.target.value;
    scheduleColorRefresh();
  });
  els.elementColor.addEventListener('input', (e) => {
    state.elementColor = e.target.value;
    scheduleColorRefresh();
  });
  els.scacchiOutline.addEventListener('change', (e) => {
    state.scacchiOutline = e.target.checked;
    updateColorOptionsVisibility();
    refreshPoster();
  });
  els.scacchiColor.addEventListener('input', (e) => {
    state.scacchiColor = e.target.value;
    scheduleColorRefresh();
  });
  els.scacchiStroke.addEventListener('input', (e) => {
    state.scacchiStrokeWeight = Number(e.target.value);
    els.scacchiStrokeValue.textContent = String(state.scacchiStrokeWeight);
    if (state.scacchiOutline) scheduleColorRefresh();
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
  els.randomColors.addEventListener('change', (e) => {
    setRandomColorsEnabled(e.target.checked);
  });
  els.generate.addEventListener('click', () => generatePoster().catch(reportError));
  els.regenerate.addEventListener('click', () => generatePoster().catch(reportError));
  els.exportPng.addEventListener('click', () => downloadPng(els.preview, state.formatId));
  els.exportJpg.addEventListener('click', () => downloadJpg(els.preview, state.formatId));
  els.exportPdf.addEventListener('click', () => downloadPdf(els.preview, state.formatId, getFormat(state.formatId)));

  updateButtons();
  updateColorOptionsVisibility();
}

init().catch((err) => {
  console.error(err);
  alert(err.message);
});

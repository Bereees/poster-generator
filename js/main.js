import { FORMATS, getFormat } from './formats.js';
import { GRIDS, getGrid, getCellCount } from './grids.js';
import { buildImagePool, sampleImages } from './sampler.js';
import { computeLayout } from './layout.js';
import { renderPoster, clearImageCache, setAssetVersion } from './renderer.js';
import { downloadPng, downloadJpg, downloadPdf } from './export.js';
import { initThemeToggle } from './theme.js';
import { getCategoryLogo } from './categoryLogos.js';
import { sortCategories } from './categories.js';
import { randomHexColors } from './colors.js';
import {
  hasScacchiCategory,
  hasNecropoliCategory,
  hasPoesieCategory,
  hasStemmiCategory,
  hasArticoliCategory,
  hasVectorCategory,
  isVectorCategoryOnly,
  getVectorGapPx,
  getVectorFitScale,
  clearSvgCache,
} from './scacchi.js';

const PREVIEW_DEBOUNCE_MS = 180;

const state = {
  manifest: null,
  formatId: 'a4-verticale',
  gridId: '5x7',
  selectedCategories: new Set(),
  backgroundColor: '#ffffff',
  tintColor: '#1a1a1a',
  adaptiveFooter: false,
  description: '',
  descriptionFontWeight: 50,
  randomRotation: false,
  randomizeFigures: true,
  scacchiOutline: false,
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
  descriptionSize: document.getElementById('description-size'),
  descriptionSizeValue: document.getElementById('description-size-value'),
  randomRotation: document.getElementById('random-rotation'),
  randomizeFigures: document.getElementById('randomize-figures'),
  regenerate: document.getElementById('regenerate'),
  exportPng: document.getElementById('export-png'),
  exportJpg: document.getElementById('export-jpg'),
  exportPdf: document.getElementById('export-pdf'),
  preview: document.getElementById('preview'),
  previewPlaceholder: document.getElementById('preview-placeholder'),
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

let previewToken = 0;
let previewTimer;

function setLoading(isLoading) {
  els.loadingSpinner.hidden = !isLoading;
  if (isLoading) {
    els.regenerate.disabled = true;
  } else {
    updateButtons();
  }
}

function updateButtons() {
  const hasCategories = state.selectedCategories.size > 0;
  els.regenerate.disabled = !hasCategories || !state.hasGenerated;
  els.exportPng.disabled = !state.hasGenerated;
  els.exportJpg.disabled = !state.hasGenerated;
  els.exportPdf.disabled = !state.hasGenerated;
}

function showPreviewPlaceholder(show) {
  els.previewPlaceholder.hidden = !show;
}

function clearPreview() {
  previewToken += 1;
  state.hasGenerated = false;
  state.imageSrcs = [];
  state.imageRotations = [];
  els.preview.width = 0;
  els.preview.height = 0;
  showPreviewPlaceholder(true);
  updateButtons();
}

function applyRotations() {
  state.imageRotations = state.randomRotation
    ? state.imageSrcs.map(() => Math.random() * Math.PI * 2)
    : state.imageSrcs.map(() => 0);
}

function resamplePosterImages() {
  const selectedCategoryIds = [...state.selectedCategories];
  const pool = buildImagePool(state.manifest, selectedCategoryIds);
  const grid = getGrid(state.gridId);
  const count = getCellCount(state.gridId);
  state.imageSrcs = sampleImages(pool, count, grid, {
    randomizeFigures: state.randomizeFigures,
    manifest: state.manifest,
    selectedCategoryIds,
  });
  applyRotations();
  if (state.randomColorsEnabled) {
    applyRandomImageColors();
  }
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
  for (const cat of sortCategories(state.manifest.categories)) {
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
      if (!state.selectedCategories.size) {
        clearPreview();
        return;
      }
      schedulePreviewUpdate({ resample: true });
    });

    label.append(input);

    const logoSrc = getCategoryLogo(cat.id);
    if (logoSrc) {
      const logo = document.createElement('img');
      logo.src = `${logoSrc}?v=${encodeURIComponent(state.manifest.generatedAt)}`;
      logo.alt = '';
      logo.className = 'category-logo';
      label.append(logo);
    }

    label.append(document.createTextNode(empty ? `${cat.label} (vuota)` : cat.label));
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
      schedulePreviewUpdate({ resample: true });
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
      schedulePreviewUpdate({ resample: true });
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

  const hasDisegni = hasDisegniCategory(state.selectedCategories);

  if (hasDisegni && !hasVectorCategory(state.selectedCategories)) {
    state.elementColor = state.tintColor;
  } else if (hasVectorCategory(state.selectedCategories)) {
    state.elementColor = state.scacchiColor;
  }

  els.elementColor.value = state.elementColor;
}

function updateColorOptionsVisibility() {
  const hasScacchi = hasScacchiCategory(state.selectedCategories);
  const hasDisegni = hasDisegniCategory(state.selectedCategories);
  const multi = isMultiCategory(state.selectedCategories);
  const vectorOnly = isVectorCategoryOnly(state.selectedCategories);
  const disegniOnly = state.selectedCategories.size === 1 && hasDisegni;

  els.elementColorSection.hidden = !multi;
  els.tintSection.hidden = multi || !disegniOnly;
  els.scacchiColorSection.hidden = multi || !vectorOnly;
  els.scacchiOutlineOptions.hidden = !hasScacchi;
  els.scacchiStrokeField.hidden = !hasScacchi || !els.scacchiOutline.checked;

  const hasColorable =
    hasScacchi ||
    hasNecropoliCategory(state.selectedCategories) ||
    hasPoesieCategory(state.selectedCategories) ||
    hasStemmiCategory(state.selectedCategories) ||
    hasArticoliCategory(state.selectedCategories) ||
    hasDisegni;
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
  if (enabled && state.imageSrcs.length) {
    applyRandomImageColors();
  } else if (!enabled) {
    state.randomColors = null;
  }
  updateColorOptionsVisibility();
  schedulePreviewUpdate({ resample: false });
}

function getLayoutOptions() {
  const format = getPosterFormat();
  const options = { descriptionFontWeight: state.descriptionFontWeight };
  const gapPx = getVectorGapPx(format, state.selectedCategories);
  if (gapPx != null) options.gapPx = gapPx;
  return options;
}

function getScacchiRenderOptions() {
  if (!hasVectorCategory(state.selectedCategories)) return null;
  const multi = isMultiCategory(state.selectedCategories);
  return {
    outline: hasScacchiCategory(state.selectedCategories) && state.scacchiOutline,
    color: multi ? state.elementColor : state.scacchiColor,
    strokeWeight: state.scacchiStrokeWeight,
  };
}

function getRenderOptions() {
  const hasDisegni = hasDisegniCategory(state.selectedCategories);
  const multi = isMultiCategory(state.selectedCategories);

  let tintColor = null;
  if (multi && hasDisegni) {
    tintColor = state.elementColor;
  } else if (!hasVectorCategory(state.selectedCategories) && hasDisegni) {
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
    scacchiFitScale: hasVectorCategory(state.selectedCategories)
      ? getVectorFitScale(
          state.selectedCategories,
          Boolean(getScacchiRenderOptions()?.outline)
        )
      : 1,
    imageColors: state.randomColors,
  };
}

async function updatePreview({ resample = false, loading = false } = {}) {
  if (!state.selectedCategories.size) {
    clearPreview();
    return;
  }

  if (resample || !state.imageSrcs.length) {
    clearSvgCache();
    clearImageCache();
    resamplePosterImages();
  }

  const token = ++previewToken;
  if (loading) setLoading(true);

  try {
    const format = getPosterFormat();
    const layout = computeLayout(format, getLayoutOptions());
    await renderPoster(els.preview, format, layout, state.imageSrcs, getRenderOptions());
    if (token !== previewToken) return;

    state.hasGenerated = true;
    showPreviewPlaceholder(false);
    updateButtons();
  } finally {
    if (loading) setLoading(false);
  }
}

function schedulePreviewUpdate(options = {}) {
  if (!state.selectedCategories.size) {
    clearPreview();
    return;
  }

  clearTimeout(previewTimer);
  previewTimer = setTimeout(() => {
    updatePreview(options).catch(reportError);
  }, PREVIEW_DEBOUNCE_MS);
}

function scheduleStyleRefresh() {
  schedulePreviewUpdate({ resample: false });
}

function closeCollapsible(root) {
  const trigger = root.querySelector('.collapsible-trigger');
  const panel = root.querySelector('.collapsible-panel');
  root.classList.remove('is-open');
  trigger.setAttribute('aria-expanded', 'false');
  panel.hidden = true;
}

function openCollapsible(root) {
  const trigger = root.querySelector('.collapsible-trigger');
  const panel = root.querySelector('.collapsible-panel');
  root.classList.add('is-open');
  trigger.setAttribute('aria-expanded', 'true');
  panel.hidden = false;
}

function closeAllCollapsibles() {
  document.querySelectorAll('[data-collapsible]').forEach((root) => closeCollapsible(root));
}

function initCollapsibles() {
  document.querySelectorAll('[data-collapsible]').forEach((root) => {
    const trigger = root.querySelector('.collapsible-trigger');
    const panel = root.querySelector('.collapsible-panel');

    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = root.classList.contains('is-open');
      if (isOpen) {
        closeCollapsible(root);
      } else {
        closeAllCollapsibles();
        openCollapsible(root);
      }
    });

    panel.addEventListener('change', (e) => {
      if (root.hasAttribute('data-stay-open')) return;
      if (e.target.matches('input[type="checkbox"], input[type="radio"]')) {
        closeCollapsible(root);
      }
    });
  });

  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-collapsible]')) return;
    closeAllCollapsibles();
  });
}

function reportError(err) {
  console.error(err);
  alert(err.message ?? 'Errore durante la generazione del poster.');
}

async function init() {
  const res = await fetch('manifest.json', { cache: 'no-store' });
  if (!res.ok) throw new Error('manifest.json non trovato. Esegui: node scripts/generate-manifest.mjs');
  state.manifest = await res.json();
  setAssetVersion(state.manifest.generatedAt);

  renderCategoryControls();
  renderFormatControls();
  renderGridControls();
  initCollapsibles();
  initThemeToggle(els.themeToggle);

  els.background.addEventListener('input', (e) => {
    state.backgroundColor = e.target.value;
    scheduleStyleRefresh();
  });
  els.tintColor.addEventListener('input', (e) => {
    state.tintColor = e.target.value;
    scheduleStyleRefresh();
  });
  els.elementColor.addEventListener('input', (e) => {
    state.elementColor = e.target.value;
    scheduleStyleRefresh();
  });
  els.scacchiOutline.addEventListener('change', (e) => {
    state.scacchiOutline = e.target.checked;
    updateColorOptionsVisibility();
    scheduleStyleRefresh();
  });
  els.scacchiColor.addEventListener('input', (e) => {
    state.scacchiColor = e.target.value;
    scheduleStyleRefresh();
  });
  els.scacchiStroke.addEventListener('input', (e) => {
    state.scacchiStrokeWeight = Number(e.target.value);
    els.scacchiStrokeValue.textContent = String(state.scacchiStrokeWeight);
    if (state.scacchiOutline) scheduleStyleRefresh();
  });
  els.adaptiveFooter.addEventListener('change', (e) => {
    state.adaptiveFooter = e.target.checked;
    scheduleStyleRefresh();
  });
  els.description.addEventListener('input', (e) => {
    state.description = e.target.value;
    scheduleStyleRefresh();
  });
  els.descriptionSize.addEventListener('input', (e) => {
    state.descriptionFontWeight = Number(e.target.value);
    els.descriptionSizeValue.textContent = String(state.descriptionFontWeight);
    scheduleStyleRefresh();
  });
  els.randomRotation.addEventListener('change', (e) => {
    state.randomRotation = e.target.checked;
    if (state.imageSrcs.length) {
      applyRotations();
      scheduleStyleRefresh();
    }
  });
  els.randomizeFigures.addEventListener('change', (e) => {
    state.randomizeFigures = e.target.checked;
    schedulePreviewUpdate({ resample: true });
  });
  els.randomColors.addEventListener('change', (e) => {
    setRandomColorsEnabled(e.target.checked);
  });
  els.regenerate.addEventListener('click', () => {
    updatePreview({ resample: true, loading: true }).catch(reportError);
  });
  els.exportPng.addEventListener('click', () => downloadPng(els.preview, state.formatId));
  els.exportJpg.addEventListener('click', () => downloadJpg(els.preview, state.formatId));
  els.exportPdf.addEventListener('click', () => downloadPdf(els.preview, state.formatId, getFormat(state.formatId)));

  updateButtons();
  updateColorOptionsVisibility();
  showPreviewPlaceholder(true);
}

init().catch((err) => {
  console.error(err);
  alert(err.message);
});

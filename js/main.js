import { FORMATS, getFormat } from './formats.js';
import { GRIDS, getGrid, getCellCount } from './grids.js';
import { buildImagePool, sampleImages } from './sampler.js';
import { computeLayout } from './layout.js';
import { renderPoster } from './renderer.js';
import { downloadPng, downloadJpg, downloadPdf } from './export.js';

const state = {
  manifest: null,
  formatId: 'a4-verticale',
  gridId: '5x7',
  selectedCategories: new Set(),
  backgroundColor: '#ffffff',
  description: '',
  imageSrcs: [],
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
      updateButtons();
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
    });
    label.append(input, document.createTextNode(grid.label));
    els.grids.append(label);
  }
  updateGridSummary();
}

async function generatePoster() {
  const format = { ...getFormat(state.formatId), grid: getGrid(state.gridId) };
  const pool = buildImagePool(state.manifest, [...state.selectedCategories]);
  const count = getCellCount(state.gridId);
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
  const res = await fetch('manifest.json');
  if (!res.ok) throw new Error('manifest.json non trovato. Esegui: node scripts/generate-manifest.mjs');
  state.manifest = await res.json();

  renderCategoryControls();
  renderFormatControls();
  renderGridControls();

  els.background.addEventListener('input', (e) => {
    state.backgroundColor = e.target.value;
  });
  els.description.addEventListener('input', (e) => {
    state.description = e.target.value;
  });
  els.generate.addEventListener('click', generatePoster);
  els.regenerate.addEventListener('click', generatePoster);
  els.exportPng.addEventListener('click', () => downloadPng(els.preview, state.formatId));
  els.exportJpg.addEventListener('click', () => downloadJpg(els.preview, state.formatId));
  els.exportPdf.addEventListener('click', () => downloadPdf(els.preview, state.formatId, getFormat(state.formatId)));

  updateButtons();
}

init().catch((err) => {
  console.error(err);
  alert(err.message);
});

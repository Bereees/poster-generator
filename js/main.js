import { FORMATS, getFormat, getCellCount } from './formats.js';
import { buildImagePool, sampleImages } from './sampler.js';
import { computeLayout } from './layout.js';
import { renderPoster } from './renderer.js';
import { downloadPng, downloadJpg, downloadPdf } from './export.js';

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
    input.addEventListener('change', () => {
      state.formatId = id;
    });
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
  const res = await fetch('manifest.json');
  if (!res.ok) throw new Error('manifest.json non trovato. Esegui: node scripts/generate-manifest.mjs');
  state.manifest = await res.json();

  renderCategoryControls();
  renderFormatControls();

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
